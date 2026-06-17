import type { TableRow, SearchResult } from "./types.js";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchRows(rows: readonly TableRow[], query: string): SearchResult {
  if (query === "") {
    return { filteredRows: rows, matchCount: rows.length };
  }

  const pattern = new RegExp(escapeRegExp(query), "i");

  const filteredRows = rows.filter((row) => {
    if (row.kind === "error") {
      return pattern.test(row.errorMessage) || pattern.test(row.raw);
    }
    // kind === "ok"
    return Object.values(row.cells).some((cell) => pattern.test(cell.display));
  });

  return { filteredRows, matchCount: filteredRows.length };
}
