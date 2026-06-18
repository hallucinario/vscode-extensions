import type { TableRow, ColumnDef } from "../types.js";
import { DEFAULT_COLUMN_WIDTH } from "../core/columnLayout.js";

export function renderRow(
  row: TableRow,
  columns: readonly ColumnDef[],
  rowIndex: number,
  lineNumWidth: string,
  columnWidths: Record<string, number>,
  isSelected: boolean,
  matchedCells: ReadonlySet<string> | undefined,
  onRowClick: (index: number) => void,
  onRowDblClick: (lineNumber: number) => void,
  onCellClick: (value: string) => void,
): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("role", "row");
  el.setAttribute("aria-rowindex", String(row.lineNumber));
  el.classList.add("data-row");
  if (isSelected) {
    el.classList.add("selected");
    el.setAttribute("aria-selected", "true");
  }

  const lineNumEl = document.createElement("div");
  lineNumEl.setAttribute("role", "gridcell");
  lineNumEl.classList.add("cell", "line-num-col");
  lineNumEl.textContent = String(row.lineNumber);
  lineNumEl.style.width = lineNumWidth;
  lineNumEl.style.minWidth = lineNumWidth;
  el.appendChild(lineNumEl);

  if (row.kind === "error") {
    el.classList.add("error-row");
    lineNumEl.classList.add("error-line-num");

    const errorCell = document.createElement("div");
    errorCell.setAttribute("role", "gridcell");
    errorCell.classList.add("cell", "error-cell");
    errorCell.style.flex = "1";
    errorCell.textContent = `⚠ ${row.errorMessage}`;
    errorCell.title = row.raw;
    el.appendChild(errorCell);
  } else {
    for (const col of columns) {
      const cell = row.cells[col.key];
      const cellEl = document.createElement("div");
      cellEl.setAttribute("role", "gridcell");
      cellEl.classList.add("cell");

      const width = columnWidths[col.key] ?? DEFAULT_COLUMN_WIDTH;
      cellEl.style.width = `${width}px`;
      cellEl.style.minWidth = `${width}px`;
      cellEl.style.flexShrink = "0";

      const display = cell?.display ?? "";
      cellEl.textContent = display;
      cellEl.title = cell ? JSON.stringify(cell.raw) : "";

      if (matchedCells?.has(col.key)) {
        cellEl.classList.add("search-match");
      }

      cellEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if (display) {
          onCellClick(typeof cell?.raw === "string" ? cell.raw : display);
        }
        onRowClick(rowIndex);
      });

      el.appendChild(cellEl);
    }
  }

  el.addEventListener("click", () => onRowClick(rowIndex));
  el.addEventListener("dblclick", () => onRowDblClick(row.lineNumber));

  return el;
}
