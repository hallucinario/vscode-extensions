export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type ParsedLine =
  | { readonly kind: "ok"; readonly lineNumber: number; readonly raw: string; readonly data: JsonValue }
  | { readonly kind: "error"; readonly lineNumber: number; readonly raw: string; readonly errorMessage: string };

export type ParseResult = {
  readonly lines: readonly ParsedLine[];
  readonly totalLines: number;
  readonly errorCount: number;
};

export type TreeNode = {
  readonly label: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly value?: string;
  readonly lineNumber?: number;
  readonly contextValue: "entry" | "property" | "error" | "arrayItem";
  readonly children: readonly TreeNode[];
  readonly collapsible: boolean;
};

export type ColumnDef = {
  readonly key: string;
  readonly label: string;
};

export type CellValue = {
  readonly raw: unknown;
  readonly display: string;
};

export type TableRow =
  | { readonly kind: "ok"; readonly lineNumber: number; readonly cells: Record<string, CellValue> }
  | { readonly kind: "error"; readonly lineNumber: number; readonly raw: string; readonly errorMessage: string };

export type TableData = {
  readonly columns: readonly ColumnDef[];
  readonly rows: readonly TableRow[];
  readonly totalLines: number;
  readonly errorCount: number;
};

export type SearchResult = {
  readonly filteredRows: readonly TableRow[];
  readonly matchCount: number;
};

export type ToWebviewMessage =
  | { readonly type: "update"; readonly data: TableData }
  | { readonly type: "clear" }
  | { readonly type: "searchResult"; readonly data: SearchResult };

export type FromWebviewMessage =
  | { readonly type: "copyValue"; readonly value: string }
  | { readonly type: "copyRow"; readonly lineNumber: number }
  | { readonly type: "goToLine"; readonly lineNumber: number }
  | { readonly type: "search"; readonly query: string }
  | { readonly type: "ready" };
