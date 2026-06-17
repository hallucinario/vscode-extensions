import type { TableRow, ColumnDef } from "../types.js";
import { syntaxHighlightJson } from "./syntaxHighlight.js";

export function renderDetailContent(
  container: HTMLElement,
  titleEl: HTMLElement,
  row: TableRow,
  columns: readonly ColumnDef[],
): void {
  if (row.kind === "error") {
    titleEl.textContent = `Line ${row.lineNumber} (Error)`;
    container.innerHTML = "";
    const errorBlock = document.createElement("div");
    errorBlock.classList.add("detail-error");
    errorBlock.textContent = `⚠ ${row.errorMessage}`;
    container.appendChild(errorBlock);

    const rawBlock = document.createElement("pre");
    rawBlock.classList.add("detail-raw");
    rawBlock.textContent = row.raw;
    container.appendChild(rawBlock);
  } else {
    titleEl.textContent = `Line ${row.lineNumber}`;
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      const cell = row.cells[col.key];
      if (cell) {
        obj[col.key] = cell.raw;
      }
    }
    const json = JSON.stringify(obj, null, 2);
    container.innerHTML = `<pre class="detail-json">${syntaxHighlightJson(json)}</pre>`;
  }
}

export function getDetailRowJson(row: TableRow, columns: readonly ColumnDef[]): string {
  if (row.kind === "error") return row.raw;
  const obj: Record<string, unknown> = {};
  for (const col of columns) {
    const cell = row.cells[col.key];
    if (cell) {
      obj[col.key] = cell.raw;
    }
  }
  return JSON.stringify(obj, null, 2);
}
