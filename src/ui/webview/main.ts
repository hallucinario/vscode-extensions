import type { ToWebviewMessage, FromWebviewMessage, TableRow, ColumnDef, ParsedLineMsg } from "./types.js";
import type { ParsedLine } from "../../core/jsonl/types.js";
import { createStore } from "./state/store.js";
import { createPersistence } from "./state/persistence.js";
import { computeRowTopVar, computeSentinelHeightVar, findRowAtScrollTop, computeRowHeight } from "./core/virtualScroll.js";
import { searchRows } from "./core/search.js";
import { sortRows } from "./core/sort.js";
import { handleKeydown } from "./core/keyboardNav.js";
import { copyRowAsJson, copyCellValue } from "./core/clipboard.js";
import { renderHeader, computeLineNumWidth } from "./render/header.js";
import { renderRow, EXPANSION_HEIGHT } from "./render/row.js";
import { formatStatus } from "./render/statusBar.js";
import { showEmptyState, hideEmptyState, showLoading, hideLoading } from "./render/emptyState.js";
import { computeTotalRowWidth, autoFitColumnWidths } from "./core/columnLayout.js";

const ROW_HEIGHT = 28;
const OVERSCAN = 10;
const SEARCH_DEBOUNCE_MS = 100;

const vscodeApi = acquireVsCodeApi();
const store = createStore();
const persistence = createPersistence(vscodeApi);

// --- DOM Elements ---
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const searchClear = document.getElementById("search-clear") as HTMLButtonElement;
const searchCount = document.getElementById("search-count") as HTMLSpanElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;
const headerRow = document.getElementById("header-row") as HTMLDivElement;
const scrollContainer = document.getElementById("scroll-container") as HTMLDivElement;
const gridEl = document.getElementById("grid") as HTMLDivElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const loadingState = document.getElementById("loading-state") as HTMLDivElement;
const loadingText = document.getElementById("loading-text") as HTMLParagraphElement;

const sentinel = document.createElement("div");
sentinel.classList.add("scroll-sentinel");
scrollContainer.appendChild(sentinel);

const viewport = document.createElement("div");
viewport.classList.add("scroll-viewport");
scrollContainer.appendChild(viewport);

// --- Parsed lines for inline expansion ---
let currentParsedLines: readonly ParsedLineMsg[] = [];

// --- Restore persisted state ---
const persisted = persistence.restore();
if (persisted) {
  if (persisted.sortColumn) store.dispatch({ type: "setSort", column: persisted.sortColumn, asc: persisted.sortAsc });
  if (persisted.searchQuery) {
    store.dispatch({ type: "setSearch", query: persisted.searchQuery });
    searchInput.value = persisted.searchQuery;
  }
  for (const [key, width] of Object.entries(persisted.columnWidths)) {
    store.dispatch({ type: "setColumnWidth", key, width });
  }
  if (persisted.scrollTop) store.dispatch({ type: "setScrollTop", scrollTop: persisted.scrollTop });
  if (persisted.selectedRowIndex >= 0) store.dispatch({ type: "selectRow", index: persisted.selectedRowIndex });
}

// --- Derived state helpers ---
function getDisplayedRows(): readonly TableRow[] {
  return store.getState().displayedRows;
}

function getColumns(): readonly ColumnDef[] {
  return store.getState().data?.columns ?? [];
}

function getExpandedIndicesSorted(): number[] {
  return [...store.getState().expandedRows].sort((a, b) => a - b);
}

function getParsedLineForRow(row: TableRow): ParsedLine | undefined {
  const line = currentParsedLines.find((l) => l.lineNumber === row.lineNumber);
  return line as ParsedLine | undefined;
}

// Cached search state
let cachedMatchMap: ReadonlyMap<number, ReadonlySet<string>> = new Map();
let cachedOriginalIndexMap: Map<TableRow, number> = new Map();

function recomputeDisplayedRows(): void {
  const { data, searchQuery, sortColumn, sortAsc } = store.getState();
  if (!data) {
    store.dispatch({ type: "setDisplayedRows", rows: [] });
    cachedMatchMap = new Map();
    cachedOriginalIndexMap = new Map();
    return;
  }

  cachedOriginalIndexMap = new Map();
  for (let i = 0; i < data.rows.length; i++) {
    cachedOriginalIndexMap.set(data.rows[i], i);
  }

  let rows: readonly TableRow[] = data.rows;

  if (searchQuery) {
    const result = searchRows(rows, searchQuery);
    rows = result.matchedIndices.map((i) => data.rows[i]);
    cachedMatchMap = result.matchMap;
  } else {
    cachedMatchMap = new Map();
  }

  if (sortColumn) {
    rows = sortRows(rows, sortColumn, sortAsc);
  }

  store.dispatch({ type: "setDisplayedRows", rows });
}

// --- Virtual Scroll (variable height) ---
let lastRenderedRange = { start: -1, end: -1 };
let cachedGridWidth = 0;
let cachedHeaderHeight = 0;

function updateCachedLayout(): void {
  const state = store.getState();
  const columns = getColumns();
  const lineNumPx = headerRow.querySelector(".line-num-col")?.getBoundingClientRect().width ?? 40;
  cachedGridWidth = computeTotalRowWidth(lineNumPx, columns, state.columnWidths);
  cachedHeaderHeight = headerRow.offsetHeight;
}

function renderVisibleRows(): void {
  const state = store.getState();
  const rows = state.displayedRows;
  const columns = getColumns();
  const expandedIndices = getExpandedIndicesSorted();
  const expandedSet = state.expandedRows;

  const totalHeight = computeSentinelHeightVar(rows.length, ROW_HEIGHT, EXPANSION_HEIGHT, expandedSet.size);
  sentinel.style.height = `${totalHeight + cachedHeaderHeight}px`;
  sentinel.style.minWidth = `${cachedGridWidth}px`;
  viewport.style.top = `${cachedHeaderHeight}px`;
  viewport.style.minWidth = `${cachedGridWidth}px`;

  const scrollTop = scrollContainer.scrollTop;
  const containerHeight = scrollContainer.clientHeight - cachedHeaderHeight;

  const startRow = findRowAtScrollTop(scrollTop, rows.length, ROW_HEIGHT, EXPANSION_HEIGHT, expandedIndices);
  let endRow = startRow;
  let accHeight = 0;
  while (endRow < rows.length && accHeight < containerHeight + OVERSCAN * ROW_HEIGHT) {
    accHeight += computeRowHeight(endRow, ROW_HEIGHT, EXPANSION_HEIGHT, expandedSet);
    endRow++;
  }
  endRow = Math.min(rows.length, endRow + OVERSCAN);
  const adjustedStart = Math.max(0, startRow - OVERSCAN);

  if (adjustedStart === lastRenderedRange.start && endRow === lastRenderedRange.end) return;
  lastRenderedRange = { start: adjustedStart, end: endRow };

  viewport.innerHTML = "";
  const lineNumWidth = computeLineNumWidth(state.data?.totalLines ?? 0);

  for (let i = adjustedStart; i < endRow; i++) {
    const row = rows[i];
    const originalIndex = cachedOriginalIndexMap.get(row) ?? i;
    const matchedCells = cachedMatchMap.get(originalIndex);
    const isExpanded = expandedSet.has(i);
    const parsedLine = isExpanded ? getParsedLineForRow(row) : undefined;

    const rowEl = renderRow(
      row, columns, i, lineNumWidth, state.columnWidths,
      i === state.selectedRowIndex,
      isExpanded,
      parsedLine,
      matchedCells as Set<string> | undefined,
      handleToggle,
      handleRowClick,
      handleRowDblClick,
      handleCellClick,
    );
    rowEl.style.position = "absolute";
    rowEl.style.top = `${computeRowTopVar(i, ROW_HEIGHT, EXPANSION_HEIGHT, expandedIndices)}px`;
    rowEl.style.minWidth = `${cachedGridWidth}px`;
    viewport.appendChild(rowEl);
  }
}

scrollContainer.addEventListener("scroll", () => {
  store.dispatch({ type: "setScrollTop", scrollTop: scrollContainer.scrollTop });
  renderVisibleRows();
}, { passive: true });

// --- Event Handlers ---
function handleToggle(index: number): void {
  store.dispatch({ type: "toggleRowExpanded", index });
  lastRenderedRange = { start: -1, end: -1 };
  renderVisibleRows();
}

function handleRowClick(index: number): void {
  store.dispatch({ type: "selectRow", index });
  renderVisibleRows();
}

function handleRowDblClick(lineNumber: number): void {
  postMessage({ type: "goToLine", lineNumber });
}

function handleCellClick(value: string): void {
  copyCellValue(value, vscodeApi);
  showCopiedTooltip();
}

function handleSort(key: string): void {
  const { sortColumn, sortAsc } = store.getState();
  if (sortColumn === key) {
    store.dispatch({ type: "setSort", column: key, asc: !sortAsc });
  } else {
    store.dispatch({ type: "setSort", column: key, asc: true });
  }
  store.dispatch({ type: "collapseAllRows" });
  recomputeDisplayedRows();
  store.dispatch({ type: "selectRow", index: -1 });
  renderAll();
}

// --- Search ---
let searchTimer: ReturnType<typeof setTimeout> | undefined;

searchInput.addEventListener("input", () => {
  if (searchTimer !== undefined) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const query = searchInput.value.trim();
    store.dispatch({ type: "setSearch", query });
    store.dispatch({ type: "selectRow", index: -1 });
    store.dispatch({ type: "collapseAllRows" });
    recomputeDisplayedRows();
    renderAll();
  }, SEARCH_DEBOUNCE_MS);
});

searchClear.addEventListener("click", () => {
  searchInput.value = "";
  store.dispatch({ type: "setSearch", query: "" });
  store.dispatch({ type: "selectRow", index: -1 });
  store.dispatch({ type: "collapseAllRows" });
  recomputeDisplayedRows();
  renderAll();
  searchInput.focus();
});

// --- Keyboard ---
gridEl.addEventListener("keydown", (e: KeyboardEvent) => {
  const meta = e.metaKey || e.ctrlKey;
  const state = store.getState();
  const rows = getDisplayedRows();
  const visibleRows = Math.floor(scrollContainer.clientHeight / ROW_HEIGHT);

  // Handle ArrowRight/Left for expand/collapse
  if (!meta && (e.key === "ArrowRight" || e.key === "ArrowLeft") && state.selectedRowIndex >= 0) {
    if (e.key === "ArrowRight" && !state.expandedRows.has(state.selectedRowIndex)) {
      handleToggle(state.selectedRowIndex);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft" && state.expandedRows.has(state.selectedRowIndex)) {
      handleToggle(state.selectedRowIndex);
      e.preventDefault();
      return;
    }
  }

  const handled = handleKeydown(e.key, meta, {
    rowCount: rows.length,
    selectedIndex: state.selectedRowIndex,
    visibleRowCount: visibleRows,
    detailOpen: false,
    onSelect: (index: number) => {
      store.dispatch({ type: "selectRow", index });
      const expandedIndices = getExpandedIndicesSorted();
      scrollContainer.scrollTop = computeRowTopVar(
        Math.max(0, index - Math.floor(visibleRows / 2)),
        ROW_HEIGHT, EXPANSION_HEIGHT, expandedIndices,
      );
      renderVisibleRows();
    },
    onToggleDetail: () => {
      if (state.selectedRowIndex >= 0) {
        handleToggle(state.selectedRowIndex);
      }
    },
    onFocusSearch: () => {
      searchInput.focus();
      searchInput.select();
    },
    onCopyRow: (index: number) => {
      const row = rows[index];
      if (row) copyRowAsJson(row, getColumns(), vscodeApi);
      showCopiedTooltip();
    },
  });

  if (handled) {
    e.preventDefault();
    e.stopPropagation();
  }
});

// --- Rendering ---
function renderAll(): void {
  const state = store.getState();
  const data = state.data;
  const rows = state.displayedRows;

  if (!data || data.rows.length === 0) {
    showEmptyState(emptyState);
    gridEl.classList.add("hidden");
    statusEl.textContent = "";
    searchCount.textContent = "";
    return;
  }

  hideEmptyState(emptyState);
  hideLoading(loadingState);
  gridEl.classList.remove("hidden");

  const autoWidths = autoFitColumnWidths(data.rows, data.columns);
  for (const [key, width] of Object.entries(autoWidths)) {
    if (!(key in state.columnWidths)) {
      store.dispatch({ type: "setColumnWidth", key, width });
    }
  }

  const lineNumWidth = computeLineNumWidth(data.totalLines);
  renderHeader(headerRow, data.columns, {
    column: state.sortColumn,
    asc: state.sortAsc,
  }, lineNumWidth, store.getState().columnWidths, handleSort);

  updateCachedLayout();
  headerRow.style.minWidth = `${cachedGridWidth}px`;

  gridEl.setAttribute("aria-rowcount", String(rows.length));
  gridEl.setAttribute("aria-colcount", String(data.columns.length + 1));

  lastRenderedRange = { start: -1, end: -1 };
  renderVisibleRows();

  statusEl.textContent = formatStatus({
    shownCount: rows.length,
    totalRows: data.rows.length,
    errorCount: data.errorCount,
    totalLines: data.totalLines,
    searchQuery: state.searchQuery,
  });

  if (state.searchQuery) {
    searchCount.textContent = `${rows.length} of ${data.rows.length}`;
  } else {
    searchCount.textContent = "";
  }
}

// --- "Copied" tooltip ---
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
function showCopiedTooltip(): void {
  const tooltip = document.getElementById("copied-tooltip");
  if (!tooltip) return;
  tooltip.classList.remove("hidden");
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => tooltip.classList.add("hidden"), 1000);
}

// --- Message handling ---
let initialScrollRestored = false;

window.addEventListener("message", (event: MessageEvent<ToWebviewMessage>) => {
  const msg = event.data;
  switch (msg.type) {
    case "update":
      hideLoading(loadingState);
      currentParsedLines = msg.parsedLines;
      store.dispatch({ type: "setData", data: msg.data });
      recomputeDisplayedRows();

      if (!initialScrollRestored && persisted?.scrollTop) {
        initialScrollRestored = true;
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = persisted.scrollTop;
        });
      }
      renderAll();
      break;
    case "clear":
      currentParsedLines = [];
      store.dispatch({ type: "setData", data: { columns: [], rows: [], totalLines: 0, errorCount: 0 } });
      renderAll();
      break;
    case "loading":
      showLoading(loadingState, loadingText, msg.fileName, msg.lineCount);
      break;
  }
});

// --- State persistence ---
store.subscribe(() => {
  const state = store.getState();
  persistence.save({
    scrollTop: state.scrollTop,
    selectedRowIndex: state.selectedRowIndex,
    sortColumn: state.sortColumn,
    sortAsc: state.sortAsc,
    searchQuery: state.searchQuery,
    columnWidths: state.columnWidths,
    detailOpen: false,
  });
});

// --- Helpers ---
function postMessage(msg: FromWebviewMessage): void {
  vscodeApi.postMessage(msg);
}

// --- Init ---
postMessage({ type: "ready" });
