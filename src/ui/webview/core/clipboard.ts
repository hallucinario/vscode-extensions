import type { TableRow, ColumnDef } from "../types.js";

type VscodeApi = {
  postMessage(msg: unknown): void;
};

export function copyRowAsJson(
  row: TableRow,
  columns: readonly ColumnDef[],
  vscodeApi: VscodeApi,
): void {
  if (row.kind === "error") {
    vscodeApi.postMessage({ type: "copyValue", value: row.raw });
    return;
  }
  const obj: Record<string, unknown> = {};
  for (const col of columns) {
    const cell = row.cells[col.key];
    if (cell) {
      obj[col.key] = cell.raw;
    }
  }
  vscodeApi.postMessage({ type: "copyValue", value: JSON.stringify(obj, null, 2) });
}

export function copyCellValue(display: string, vscodeApi: VscodeApi): void {
  vscodeApi.postMessage({ type: "copyValue", value: display });
}
