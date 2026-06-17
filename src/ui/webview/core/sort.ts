import type { TableRow } from "../types.js";

export function sortRows(
  rows: readonly TableRow[],
  column: string,
  asc: boolean,
): readonly TableRow[] {
  return [...rows].sort((a, b) => {
    if (a.kind === "error" && b.kind !== "error") return 1;
    if (a.kind !== "error" && b.kind === "error") return -1;
    if (a.kind === "error" && b.kind === "error") return a.lineNumber - b.lineNumber;

    const cellA = a.kind === "ok" ? a.cells[column] : undefined;
    const cellB = b.kind === "ok" ? b.cells[column] : undefined;
    const valA = cellA?.display ?? "";
    const valB = cellB?.display ?? "";

    if (valA === "" && valB !== "") return 1;
    if (valA !== "" && valB === "") return -1;
    if (valA === "" && valB === "") return a.lineNumber - b.lineNumber;

    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
      const diff = asc ? numA - numB : numB - numA;
      return diff !== 0 ? diff : a.lineNumber - b.lineNumber;
    }

    const cmp = valA.localeCompare(valB);
    if (cmp !== 0) return asc ? cmp : -cmp;
    return a.lineNumber - b.lineNumber;
  });
}
