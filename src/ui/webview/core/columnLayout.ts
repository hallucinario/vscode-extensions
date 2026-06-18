import type { TableRow, ColumnDef } from "../types.js";

export const DEFAULT_COLUMN_WIDTH = 200;
export const CHAR_WIDTH_PX = 8;
export const MIN_COL_WIDTH = 80;
export const MAX_COL_WIDTH = 400;
export const CELL_PADDING_PX = 24;

const SAMPLE_ROW_COUNT = 100;

export function computeColumnWidth(
  key: string,
  columnWidths: Record<string, number>,
): number {
  return columnWidths[key] ?? DEFAULT_COLUMN_WIDTH;
}

export function computeTotalRowWidth(
  lineNumWidthPx: number,
  columns: readonly { key: string }[],
  columnWidths: Record<string, number>,
): number {
  let total = lineNumWidthPx;
  for (const col of columns) {
    total += computeColumnWidth(col.key, columnWidths);
  }
  return total;
}

export function autoFitColumnWidths(
  rows: readonly TableRow[],
  columns: readonly ColumnDef[],
): Record<string, number> {
  if (rows.length === 0) return {};

  const maxLengths: Record<string, number> = {};

  for (const col of columns) {
    maxLengths[col.key] = col.label.length;
  }

  const sampleRows = rows.slice(0, SAMPLE_ROW_COUNT);
  for (const row of sampleRows) {
    if (row.kind !== "ok") continue;
    for (const col of columns) {
      const cell = row.cells[col.key];
      if (cell) {
        const len = cell.display.length;
        if (len > (maxLengths[col.key] ?? 0)) {
          maxLengths[col.key] = len;
        }
      }
    }
  }

  const result: Record<string, number> = {};
  for (const col of columns) {
    const charCount = maxLengths[col.key] ?? 0;
    const rawWidth = charCount * CHAR_WIDTH_PX + CELL_PADDING_PX;
    result[col.key] = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, rawWidth));
  }

  return result;
}
