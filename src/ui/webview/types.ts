export type ColumnDef = { readonly key: string; readonly label: string };
export type CellValue = { readonly raw: unknown; readonly display: string };

export type TableRow =
  | { readonly kind: "ok"; readonly lineNumber: number; readonly cells: Record<string, CellValue> }
  | { readonly kind: "error"; readonly lineNumber: number; readonly raw: string; readonly errorMessage: string };

export type TableData = {
  readonly columns: readonly ColumnDef[];
  readonly rows: readonly TableRow[];
  readonly totalLines: number;
  readonly errorCount: number;
};

export type ToWebviewMessage =
  | { readonly type: "update"; readonly data: TableData }
  | { readonly type: "clear" }
  | { readonly type: "loading"; readonly fileName: string; readonly lineCount: number };

export type FromWebviewMessage =
  | { readonly type: "copyValue"; readonly value: string }
  | { readonly type: "copyRow"; readonly lineNumber: number }
  | { readonly type: "goToLine"; readonly lineNumber: number }
  | { readonly type: "ready" };
