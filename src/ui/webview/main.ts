import type {
  ToWebviewMessage,
  FromWebviewMessage,
  TableData,
  TableRow,
  ColumnDef,
  SearchResult,
} from "./types.js";

const vscodeApi = acquireVsCodeApi();

// State
let currentData: TableData | undefined;
let displayedRows: readonly TableRow[] = [];
let sortColumn: string | undefined;
let sortAsc = true;
let selectedRowIndex = -1;

// DOM elements
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;
const headerRow = document.getElementById("header-row") as HTMLTableRowElement;
const tableBody = document.getElementById("table-body") as HTMLTableSectionElement;
const detailPanel = document.getElementById("detail-panel") as HTMLDivElement;
const detailTitle = document.getElementById("detail-title") as HTMLSpanElement;
const detailContent = document.getElementById("detail-content") as HTMLPreElement;
const detailClose = document.getElementById("detail-close") as HTMLButtonElement;

// --- Message handling ---

window.addEventListener("message", (event: MessageEvent<ToWebviewMessage>) => {
  const msg = event.data;
  switch (msg.type) {
    case "update":
      currentData = msg.data;
      displayedRows = msg.data.rows;
      sortColumn = undefined;
      sortAsc = true;
      selectedRowIndex = -1;
      renderAll();
      break;
    case "clear":
      currentData = undefined;
      displayedRows = [];
      renderAll();
      break;
    case "searchResult":
      handleSearchResult(msg.data);
      break;
  }
});

// --- Search ---

let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

searchInput.addEventListener("input", () => {
  if (searchDebounceTimer !== undefined) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const query = searchInput.value.trim();
    if (query === "" && currentData) {
      displayedRows = currentData.rows;
      selectedRowIndex = -1;
      renderTable();
      updateStatus();
    } else {
      postMessage({ type: "search", query });
    }
  }, 250);
});

function handleSearchResult(result: SearchResult): void {
  displayedRows = result.filteredRows;
  selectedRowIndex = -1;
  renderTable();
  updateStatus();
}

// --- Rendering ---

function renderAll(): void {
  renderHeader();
  renderTable();
  updateStatus();
  hideDetail();
}

function renderHeader(): void {
  headerRow.innerHTML = "";
  if (!currentData) return;

  // Line number column
  const lineNumTh = document.createElement("th");
  lineNumTh.textContent = "#";
  lineNumTh.classList.add("line-num-col");
  headerRow.appendChild(lineNumTh);

  for (const col of currentData.columns) {
    const th = document.createElement("th");
    th.textContent = col.label;
    th.dataset.key = col.key;
    th.classList.add("sortable");

    if (sortColumn === col.key) {
      th.classList.add(sortAsc ? "sort-asc" : "sort-desc");
    }

    th.addEventListener("click", () => handleSort(col.key));
    headerRow.appendChild(th);
  }
}

function renderTable(): void {
  tableBody.innerHTML = "";
  if (!currentData) return;

  const columns = currentData.columns;

  for (let i = 0; i < displayedRows.length; i++) {
    const row = displayedRows[i];
    const tr = document.createElement("tr");
    tr.dataset.index = String(i);

    if (row.kind === "error") {
      tr.classList.add("error-row");

      // Line number
      const lineNumTd = document.createElement("td");
      lineNumTd.textContent = String(row.lineNumber);
      lineNumTd.classList.add("line-num-col");
      tr.appendChild(lineNumTd);

      // Error spans all columns
      const td = document.createElement("td");
      td.colSpan = columns.length;
      td.classList.add("error-cell");
      td.textContent = `Error: ${row.errorMessage}`;
      td.title = row.raw;
      tr.appendChild(td);
    } else {
      // Line number
      const lineNumTd = document.createElement("td");
      lineNumTd.textContent = String(row.lineNumber);
      lineNumTd.classList.add("line-num-col");
      tr.appendChild(lineNumTd);

      for (const col of columns) {
        const td = document.createElement("td");
        const cell = row.cells[col.key];
        td.textContent = cell?.display ?? "";
        td.title = cell ? JSON.stringify(cell.raw) : "";
        td.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          if (cell) {
            postMessage({
              type: "copyValue",
              value: typeof cell.raw === "string" ? cell.raw : JSON.stringify(cell.raw),
            });
          }
        });
        tr.appendChild(td);
      }
    }

    // Row click: select and show detail
    tr.addEventListener("click", () => {
      selectedRowIndex = i;
      highlightSelectedRow();
      showDetail(row, columns);
    });

    // Double-click: go to line
    tr.addEventListener("dblclick", () => {
      postMessage({ type: "goToLine", lineNumber: row.lineNumber });
    });

    tableBody.appendChild(tr);
  }
}

function highlightSelectedRow(): void {
  const rows = tableBody.querySelectorAll("tr");
  for (const r of rows) {
    r.classList.remove("selected");
  }
  if (selectedRowIndex >= 0 && selectedRowIndex < rows.length) {
    rows[selectedRowIndex].classList.add("selected");
  }
}

function showDetail(row: TableRow, columns: readonly ColumnDef[]): void {
  detailPanel.classList.remove("hidden");

  if (row.kind === "error") {
    detailTitle.textContent = `Line ${row.lineNumber} (Error)`;
    detailContent.innerHTML = "";
    detailContent.textContent = `Error: ${row.errorMessage}\n\nRaw:\n${row.raw}`;
  } else {
    detailTitle.textContent = `Line ${row.lineNumber}`;
    // Build a JSON object from cells for display
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      const cell = row.cells[col.key];
      if (cell) {
        obj[col.key] = cell.raw;
      }
    }
    const json = JSON.stringify(obj, null, 2);
    detailContent.innerHTML = syntaxHighlight(json);
  }
}

function hideDetail(): void {
  detailPanel.classList.add("hidden");
  detailContent.innerHTML = "";
}

detailClose.addEventListener("click", hideDetail);

// --- Sorting ---

function handleSort(key: string): void {
  if (sortColumn === key) {
    sortAsc = !sortAsc;
  } else {
    sortColumn = key;
    sortAsc = true;
  }

  const sorted = [...displayedRows].sort((a, b) => {
    // Errors always at the bottom
    if (a.kind === "error" && b.kind !== "error") return 1;
    if (a.kind !== "error" && b.kind === "error") return -1;
    if (a.kind === "error" && b.kind === "error") return a.lineNumber - b.lineNumber;
    if (a.kind === "error" || b.kind === "error") return 0;

    const cellA = a.cells[key];
    const cellB = b.cells[key];
    const valA = cellA?.display ?? "";
    const valB = cellB?.display ?? "";

    // Attempt numeric comparison
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
      return sortAsc ? numA - numB : numB - numA;
    }

    const cmp = valA.localeCompare(valB);
    return sortAsc ? cmp : -cmp;
  });

  displayedRows = sorted;
  selectedRowIndex = -1;
  renderHeader();
  renderTable();
}

// --- Status ---

function updateStatus(): void {
  if (!currentData) {
    statusEl.textContent = "";
    return;
  }
  const total = currentData.totalLines;
  const shown = displayedRows.length;
  const errors = currentData.errorCount;
  let text = `${shown} rows`;
  if (shown !== currentData.rows.length) {
    text += ` (filtered from ${currentData.rows.length})`;
  }
  if (errors > 0) {
    text += ` | ${errors} error${errors > 1 ? "s" : ""}`;
  }
  text += ` | ${total} total lines`;
  statusEl.textContent = text;
}

// --- Syntax highlighting for detail ---

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[\dA-Fa-f]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "json-number";
      if (match.startsWith('"')) {
        cls = match.endsWith(":") ? "json-key" : "json-string";
      } else if (/^true|false$/.test(match)) {
        cls = "json-boolean";
      } else if (match === "null") {
        cls = "json-null";
      }
      return `<span class="${cls}">${escapeHtml(match)}</span>`;
    },
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- Helpers ---

function postMessage(msg: FromWebviewMessage): void {
  vscodeApi.postMessage(msg);
}

// --- Init ---

postMessage({ type: "ready" });
