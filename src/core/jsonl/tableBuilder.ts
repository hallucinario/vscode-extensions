import type { CellValue, ColumnDef, JsonValue, ParseResult, TableData, TableRow } from "./types.js";

const MAX_DISPLAY_LENGTH = 200;
const PREVIEW_KEY_COUNT = 3;
const PREVIEW_ITEM_COUNT = 3;

function isPlainObject(v: JsonValue): v is { readonly [key: string]: JsonValue } {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function formatDisplayShort(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value.length > 30) return `"${value.slice(0, 27)}…"`;
    return `"${value}"`;
  }
  if (Array.isArray(value)) return `[${value.length}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).length}}`;
  return String(value);
}

function formatDisplay(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value.length > MAX_DISPLAY_LENGTH) {
      return value.slice(0, MAX_DISPLAY_LENGTH) + "…";
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.slice(0, PREVIEW_ITEM_COUNT).map(formatDisplayShort);
    const suffix = value.length > PREVIEW_ITEM_COUNT ? ", …" : "";
    return `[${items.join(", ")}${suffix}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    const shown = keys.slice(0, PREVIEW_KEY_COUNT);
    const entries = shown.map((k) => `${k}: ${formatDisplayShort(value[k])}`);
    const suffix = keys.length > PREVIEW_KEY_COUNT ? ", …" : "";
    return `{${entries.join(", ")}${suffix}}`;
  }
  return String(value);
}

function makeCellValue(value: JsonValue): CellValue {
  return {
    raw: value,
    display: formatDisplay(value),
  };
}

export function buildTable(result: ParseResult): TableData {
  const { lines, totalLines, errorCount } = result;

  if (lines.length === 0) {
    return { columns: [], rows: [], totalLines, errorCount };
  }

  // Collect all unique keys from ok lines with object data
  const keySet = new Set<string>();
  let hasNonObject = false;

  for (const line of lines) {
    if (line.kind === "ok") {
      if (isPlainObject(line.data)) {
        for (const key of Object.keys(line.data)) {
          keySet.add(key);
        }
      } else {
        hasNonObject = true;
      }
    }
  }

  if (hasNonObject) {
    keySet.add("__value");
  }

  // Sort columns alphabetically
  const sortedKeys = [...keySet].sort();
  const columns: ColumnDef[] = sortedKeys.map((key) => ({ key, label: key }));

  // Build rows
  const rows: TableRow[] = lines.map((line): TableRow => {
    if (line.kind === "error") {
      return {
        kind: "error",
        lineNumber: line.lineNumber,
        raw: line.raw,
        errorMessage: line.errorMessage,
      };
    }

    const cells: Record<string, CellValue> = {};

    if (isPlainObject(line.data)) {
      for (const col of sortedKeys) {
        if (col in line.data) {
          cells[col] = makeCellValue(line.data[col]);
        } else {
          cells[col] = { raw: undefined, display: "" };
        }
      }
    } else {
      // Non-object data goes into __value
      cells["__value"] = makeCellValue(line.data);
    }

    return {
      kind: "ok",
      lineNumber: line.lineNumber,
      cells,
    };
  });

  return { columns, rows, totalLines, errorCount };
}
