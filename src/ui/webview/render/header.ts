import type { ColumnDef } from "../types.js";
import { DEFAULT_COLUMN_WIDTH } from "../core/columnLayout.js";

export type SortState = {
  column: string | undefined;
  asc: boolean;
};

export function renderHeader(
  container: HTMLElement,
  columns: readonly ColumnDef[],
  sortState: SortState,
  lineNumWidth: string,
  columnWidths: Record<string, number>,
  onSort: (key: string) => void,
): void {
  container.innerHTML = "";
  container.setAttribute("role", "row");

  const lineNumEl = document.createElement("div");
  lineNumEl.setAttribute("role", "columnheader");
  lineNumEl.classList.add("cell", "line-num-col");
  lineNumEl.textContent = "#";
  lineNumEl.style.width = lineNumWidth;
  lineNumEl.style.minWidth = lineNumWidth;
  container.appendChild(lineNumEl);

  for (const col of columns) {
    const el = document.createElement("div");
    el.setAttribute("role", "columnheader");
    el.classList.add("cell", "sortable");
    el.dataset.key = col.key;

    const width = columnWidths[col.key] ?? DEFAULT_COLUMN_WIDTH;
    el.style.width = `${width}px`;
    el.style.minWidth = `${width}px`;
    el.style.flexShrink = "0";

    const label = document.createElement("span");
    label.textContent = col.label;
    el.appendChild(label);

    if (sortState.column === col.key) {
      el.setAttribute("aria-sort", sortState.asc ? "ascending" : "descending");
      const indicator = document.createElement("span");
      indicator.classList.add("sort-indicator");
      indicator.textContent = sortState.asc ? " ▲" : " ▼";
      el.appendChild(indicator);
    } else {
      el.setAttribute("aria-sort", "none");
    }

    el.addEventListener("click", () => onSort(col.key));
    container.appendChild(el);
  }
}

export function computeLineNumWidth(totalLines: number): string {
  const digits = Math.max(3, Math.ceil(Math.log10(Math.max(totalLines, 1) + 1)));
  return `${digits + 1}ch`;
}
