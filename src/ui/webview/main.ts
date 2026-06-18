import type { ToWebviewMessage, FromWebviewMessage, TableRow, ColumnDef } from "./types.js";
import { createStore } from "./state/store.js";
import { createPersistence } from "./state/persistence.js";
import { computeVisibleRange, computeRowTop, computeSentinelHeight, computeScrollTopForIndex } from "./core/virtualScroll.js";
import { searchRows } from "./core/search.js";
import { sortRows } from "./core/sort.js";
import { handleKeydown } from "./core/keyboardNav.js";
import { copyRowAsJson, copyCellValue } from "./core/clipboard.js";
import { renderHeader, computeLineNumWidth } from "./render/header.js";
import { renderRow } from "./render/row.js";
import { renderDetailContent, getDetailRowJson } from "./render/detailPanel.js";
import { formatStatus } from "./render/statusBar.js";
import { showEmptyState, hideEmptyState, showLoading, hideLoading } from "./render/emptyState.js";
import { computeTotalRowWidth } from "./core/columnLayout.js";

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
const detailPanel = document.getElementById("detail-panel") as HTMLDivElement;
const detailTitle = document.getElementById("detail-title") as HTMLSpanElement;
const detailContent = document.getElementById("detail-content") as HTMLDivElement;
const detailClose = document.getElementById("detail-close") as HTMLButtonElement;
const detailCopy = document.getElementById("detail-copy") as HTMLButtonElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const loadingState = document.getElementById("loading-state") as HTMLDivElement;
const loadingText = document.getElementById("loading-text") as HTMLParagraphElement;
const resizeHandle = document.getElementById("resize-handle") as HTMLDivElement;

// Sentinel for virtual scroll total height
const sentinel = document.createElement("div");
sentinel.classList.add("scroll-sentinel");
scrollContainer.appendChild(sentinel);

// Viewport for rendered rows
const viewport = document.createElement("div");
viewport.classList.add("scroll-viewport");
scrollContainer.appendChild(viewport);

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
  if (persisted.detailOpen) store.dispatch({ type: "setDetailOpen", open: true });
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

// Cached search state — recomputed only when search/sort/data changes, NOT on scroll
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

  // Build O(1) lookup for original row indices
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

// --- Virtual Scroll ---
let lastRenderedRange = { start: -1, end: -1 };

// Cached layout values — recomputed only in renderAll(), not on scroll
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

  const range = computeVisibleRange({
    scrollTop: scrollContainer.scrollTop,
    containerHeight: scrollContainer.clientHeight - cachedHeaderHeight,
    rowHeight: ROW_HEIGHT,
    totalCount: rows.length,
    overscan: OVERSCAN,
  });

  if (range.start === lastRenderedRange.start && range.end === lastRenderedRange.end) return;
  lastRenderedRange = range;

  sentinel.style.height = `${computeSentinelHeight(rows.length, ROW_HEIGHT) + cachedHeaderHeight}px`;
  sentinel.style.minWidth = `${cachedGridWidth}px`;
  viewport.style.top = `${cachedHeaderHeight}px`;
  viewport.style.minWidth = `${cachedGridWidth}px`;
  viewport.innerHTML = "";

  const lineNumWidth = computeLineNumWidth(state.data?.totalLines ?? 0);

  for (let i = range.start; i < range.end; i++) {
    const row = rows[i];
    const originalIndex = cachedOriginalIndexMap.get(row) ?? i;
    const matchedCells = cachedMatchMap.get(originalIndex);

    const rowEl = renderRow(
      row,
      columns,
      i,
      lineNumWidth,
      state.columnWidths,
      i === state.selectedRowIndex,
      matchedCells as Set<string> | undefined,
      handleRowClick,
      handleRowDblClick,
      handleCellClick,
    );
    rowEl.style.position = "absolute";
    rowEl.style.top = `${computeRowTop(i, ROW_HEIGHT)}px`;
    rowEl.style.minWidth = `${cachedGridWidth}px`;
    rowEl.style.height = `${ROW_HEIGHT}px`;
    viewport.appendChild(rowEl);
  }
}

scrollContainer.addEventListener("scroll", () => {
  store.dispatch({ type: "setScrollTop", scrollTop: scrollContainer.scrollTop });
  renderVisibleRows();
}, { passive: true });

// --- Event Handlers ---
function handleRowClick(index: number): void {
  store.dispatch({ type: "selectRow", index });
  store.dispatch({ type: "setDetailOpen", open: true });
  renderVisibleRows();
  updateDetailPanel();
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
    recomputeDisplayedRows();
    renderAll();
  }, SEARCH_DEBOUNCE_MS);
});

searchClear.addEventListener("click", () => {
  searchInput.value = "";
  store.dispatch({ type: "setSearch", query: "" });
  store.dispatch({ type: "selectRow", index: -1 });
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

  const handled = handleKeydown(e.key, meta, {
    rowCount: rows.length,
    selectedIndex: state.selectedRowIndex,
    visibleRowCount: visibleRows,
    detailOpen: state.detailOpen,
    onSelect: (index: number) => {
      store.dispatch({ type: "selectRow", index });
      scrollContainer.scrollTop = computeScrollTopForIndex(
        Math.max(0, index - Math.floor(visibleRows / 2)),
        ROW_HEIGHT,
      );
      renderVisibleRows();
      updateDetailPanel();
    },
    onToggleDetail: (open: boolean) => {
      store.dispatch({ type: "setDetailOpen", open });
      updateDetailVisibility();
      if (!open) gridEl.focus();
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

// --- Detail Panel ---
detailClose.addEventListener("click", () => {
  store.dispatch({ type: "setDetailOpen", open: false });
  updateDetailVisibility();
  gridEl.focus();
});

detailCopy.addEventListener("click", () => {
  const state = store.getState();
  const rows = getDisplayedRows();
  const row = state.selectedRowIndex >= 0 ? rows[state.selectedRowIndex] : undefined;
  if (row) {
    const json = getDetailRowJson(row, getColumns());
    vscodeApi.postMessage({ type: "copyValue", value: json });
    showCopiedTooltip();
  }
});

function updateDetailPanel(): void {
  const state = store.getState();
  const rows = getDisplayedRows();
  const row = state.selectedRowIndex >= 0 ? rows[state.selectedRowIndex] : undefined;

  if (row && state.detailOpen) {
    renderDetailContent(detailContent, detailTitle, row, getColumns());
    detailPanel.classList.remove("hidden");
    detailPanel.setAttribute("aria-hidden", "false");
  }
}

function updateDetailVisibility(): void {
  const state = store.getState();
  if (state.detailOpen) {
    const rows = getDisplayedRows();
    const row = state.selectedRowIndex >= 0 ? rows[state.selectedRowIndex] : undefined;
    if (row) {
      renderDetailContent(detailContent, detailTitle, row, getColumns());
    }
    detailPanel.classList.remove("hidden");
    detailPanel.setAttribute("aria-hidden", "false");
  } else {
    detailPanel.classList.add("hidden");
    detailPanel.setAttribute("aria-hidden", "true");
  }
}

// --- Detail Panel Resize ---
let isResizing = false;
let startY = 0;
let startHeight = 0;

resizeHandle.addEventListener("mousedown", (e: MouseEvent) => {
  isResizing = true;
  startY = e.clientY;
  startHeight = detailPanel.offsetHeight;
  document.body.classList.add("resizing");
  e.preventDefault();
});

document.addEventListener("mousemove", (e: MouseEvent) => {
  if (!isResizing) return;
  const delta = startY - e.clientY;
  const newHeight = Math.max(100, Math.min(window.innerHeight * 0.6, startHeight + delta));
  detailPanel.style.height = `${newHeight}px`;
});

document.addEventListener("mouseup", () => {
  if (isResizing) {
    isResizing = false;
    document.body.classList.remove("resizing");
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
    detailPanel.classList.add("hidden");
    statusEl.textContent = "";
    searchCount.textContent = "";
    return;
  }

  hideEmptyState(emptyState);
  hideLoading(loadingState);
  gridEl.classList.remove("hidden");

  const lineNumWidth = computeLineNumWidth(data.totalLines);
  renderHeader(headerRow, data.columns, {
    column: state.sortColumn,
    asc: state.sortAsc,
  }, lineNumWidth, state.columnWidths, handleSort);

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

  updateDetailVisibility();
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
    detailOpen: state.detailOpen,
  });
});

// --- Helpers ---
function postMessage(msg: FromWebviewMessage): void {
  vscodeApi.postMessage(msg);
}

// --- Init ---
postMessage({ type: "ready" });
