import type { TableRow, ColumnDef } from "../types.js";
import type { ParsedLine } from "../../../core/jsonl/types.js";
import { DEFAULT_COLUMN_WIDTH } from "../core/columnLayout.js";
import { getCellType } from "../core/cellType.js";
import { renderInlineDetailHtml } from "./inlineDetail.js";

export const EXPANSION_HEIGHT = 200;

export function renderRow(
  row: TableRow,
  columns: readonly ColumnDef[],
  rowIndex: number,
  lineNumWidth: string,
  columnWidths: Record<string, number>,
  isSelected: boolean,
  isExpanded: boolean,
  parsedLine: ParsedLine | undefined,
  matchedCells: ReadonlySet<string> | undefined,
  onToggle: (index: number) => void,
  onRowClick: (index: number) => void,
  onRowDblClick: (lineNumber: number) => void,
  onCellClick: (value: string) => void,
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.classList.add("row-wrapper");

  const el = document.createElement("div");
  el.setAttribute("role", "row");
  el.setAttribute("aria-rowindex", String(row.lineNumber));
  el.classList.add("data-row");
  if (isSelected) {
    el.classList.add("selected");
    el.setAttribute("aria-selected", "true");
  }

  const toggleBtn = document.createElement("button");
  toggleBtn.classList.add("expand-toggle");
  toggleBtn.setAttribute("aria-expanded", String(isExpanded));
  toggleBtn.textContent = isExpanded ? "▼" : "▶";
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onToggle(rowIndex);
  });
  el.appendChild(toggleBtn);

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
      const cellType = cell ? getCellType(cell.raw) : "empty";

      if (cellType === "object") {
        cellEl.classList.add("cell-object");
        const badge = document.createElement("span");
        badge.classList.add("type-badge", "obj-badge");
        badge.textContent = "{}";
        cellEl.appendChild(badge);
        const textNode = document.createElement("span");
        textNode.textContent = display.startsWith("{") ? display.slice(1, -1) : display;
        cellEl.appendChild(textNode);
      } else if (cellType === "array") {
        cellEl.classList.add("cell-array");
        const badge = document.createElement("span");
        badge.classList.add("type-badge", "arr-badge");
        badge.textContent = "[]";
        cellEl.appendChild(badge);
        const textNode = document.createElement("span");
        textNode.textContent = display.startsWith("[") ? display.slice(1, -1) : display;
        cellEl.appendChild(textNode);
      } else {
        cellEl.textContent = display;
      }
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

  wrapper.appendChild(el);

  if (isExpanded && parsedLine) {
    const expansion = document.createElement("div");
    expansion.classList.add("inline-detail");
    expansion.innerHTML = renderInlineDetailHtml(parsedLine);
    wrapper.appendChild(expansion);
  }

  return wrapper;
}
