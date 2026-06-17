import { describe, it, expect } from "vitest";
import { searchRows } from "./search.js";
import type { TableRow, CellValue } from "./types.js";

function makeOkRow(lineNumber: number, cells: Record<string, CellValue>): TableRow {
  return { kind: "ok", lineNumber, cells };
}

function cell(value: unknown, display: string): CellValue {
  return { raw: value, display };
}

function makeErrorRow(lineNumber: number, raw: string, errorMessage: string): TableRow {
  return { kind: "error", lineNumber, raw, errorMessage };
}

describe("searchRows", () => {
  const sampleRows: TableRow[] = [
    makeOkRow(1, { name: cell("Alice", "Alice"), city: cell("Tokyo", "Tokyo") }),
    makeOkRow(2, { name: cell("Bob", "Bob"), city: cell("Osaka", "Osaka") }),
    makeOkRow(3, { name: cell("Charlie", "Charlie"), city: cell("Tokyo", "Tokyo") }),
  ];

  it("returns all rows and matchCount = total when query is empty", () => {
    const result = searchRows(sampleRows, "");
    expect(result.filteredRows).toHaveLength(3);
    expect(result.matchCount).toBe(3);
  });

  it("matches case-insensitively", () => {
    const result = searchRows(sampleRows, "alice");
    expect(result.filteredRows).toHaveLength(1);
    expect(result.filteredRows[0].lineNumber).toBe(1);
  });

  it("matches in any cell column", () => {
    const result = searchRows(sampleRows, "Tokyo");
    expect(result.filteredRows).toHaveLength(2);
    const lineNumbers = result.filteredRows.map((r) => r.lineNumber);
    expect(lineNumbers).toContain(1);
    expect(lineNumbers).toContain(3);
  });

  it("returns empty filteredRows and matchCount 0 when no match", () => {
    const result = searchRows(sampleRows, "nonexistent");
    expect(result.filteredRows).toHaveLength(0);
    expect(result.matchCount).toBe(0);
  });

  it("matches error rows on errorMessage text", () => {
    const rows: TableRow[] = [
      makeErrorRow(1, "{bad}", "Unexpected token at position 1"),
      makeOkRow(2, { name: cell("Alice", "Alice") }),
    ];
    const result = searchRows(rows, "Unexpected");
    expect(result.filteredRows).toHaveLength(1);
    expect(result.filteredRows[0].kind).toBe("error");
  });

  it("matches error rows on raw text", () => {
    const rows: TableRow[] = [
      makeErrorRow(1, "{bad json here}", "parse error"),
      makeOkRow(2, { x: cell(1, "1") }),
    ];
    const result = searchRows(rows, "bad json");
    expect(result.filteredRows).toHaveLength(1);
    expect(result.filteredRows[0].lineNumber).toBe(1);
  });

  it("treats special regex characters literally", () => {
    const rows: TableRow[] = [
      makeOkRow(1, { pattern: cell("a.b", "a.b") }),
      makeOkRow(2, { pattern: cell("axb", "axb") }),
    ];
    const result = searchRows(rows, "a.b");
    // "a.b" should match only the literal "a.b", not "axb"
    expect(result.filteredRows).toHaveLength(1);
    expect(result.filteredRows[0].lineNumber).toBe(1);
  });

  it("reflects matchCount as count of filteredRows", () => {
    const result = searchRows(sampleRows, "o");
    // "Bob", "Tokyo", "Osaka", "Tokyo" all contain "o"
    // Row 1: Tokyo has "o" -> match
    // Row 2: Bob has "o", Osaka has "o" -> match
    // Row 3: Tokyo has "o" -> match
    expect(result.matchCount).toBe(result.filteredRows.length);
  });

  it("includes a row only once even when multiple cells match", () => {
    const rows: TableRow[] = [
      makeOkRow(1, {
        first: cell("Tokyo Tower", "Tokyo Tower"),
        second: cell("Tokyo Bay", "Tokyo Bay"),
      }),
    ];
    const result = searchRows(rows, "Tokyo");
    expect(result.filteredRows).toHaveLength(1);
    expect(result.matchCount).toBe(1);
  });

  it("handles rows with no cells gracefully", () => {
    const rows: TableRow[] = [
      makeOkRow(1, {}),
    ];
    const result = searchRows(rows, "anything");
    expect(result.filteredRows).toHaveLength(0);
    expect(result.matchCount).toBe(0);
  });

  it("handles empty rows array", () => {
    const result = searchRows([], "query");
    expect(result.filteredRows).toHaveLength(0);
    expect(result.matchCount).toBe(0);
  });

  it("matches on display value of cells", () => {
    const rows: TableRow[] = [
      makeOkRow(1, { count: cell(42, "42 items") }),
    ];
    const result = searchRows(rows, "42 items");
    expect(result.filteredRows).toHaveLength(1);
  });

  it("handles query with mixed case", () => {
    const rows: TableRow[] = [
      makeOkRow(1, { name: cell("ALICE", "ALICE") }),
    ];
    const result = searchRows(rows, "aLiCe");
    expect(result.filteredRows).toHaveLength(1);
  });
});
