import type { TableRow } from "../types.js";

export type ClientSearchResult = {
  readonly matchedIndices: readonly number[];
  readonly matchCount: number;
  readonly matchMap: ReadonlyMap<number, ReadonlySet<string>>;
};

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchRows(
  rows: readonly TableRow[],
  query: string,
): ClientSearchResult {
  if (query === "") {
    return {
      matchedIndices: rows.map((_, i) => i),
      matchCount: rows.length,
      matchMap: new Map(),
    };
  }

  const pattern = new RegExp(escapeRegExp(query), "i");
  const matchedIndices: number[] = [];
  const matchMap = new Map<number, Set<string>>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind === "error") {
      if (pattern.test(row.errorMessage) || pattern.test(row.raw)) {
        matchedIndices.push(i);
      }
    } else {
      const matchedKeys = new Set<string>();
      for (const [key, cell] of Object.entries(row.cells)) {
        if (pattern.test(cell.display)) {
          matchedKeys.add(key);
        }
      }
      if (matchedKeys.size > 0) {
        matchedIndices.push(i);
        matchMap.set(i, matchedKeys);
      }
    }
  }

  return { matchedIndices, matchCount: matchedIndices.length, matchMap };
}
