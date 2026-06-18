export const DEFAULT_COLUMN_WIDTH = 150;

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
