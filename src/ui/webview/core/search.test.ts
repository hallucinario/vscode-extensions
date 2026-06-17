import { describe, it, expect } from "vitest";
import { searchRows } from "./search.js";
import type { TableRow } from "../types.js";

const okRow = (lineNumber: number, cells: Record<string, { raw: unknown; display: string }>): TableRow => ({
  kind: "ok",
  lineNumber,
  cells,
});

const errorRow = (lineNumber: number, msg: string, raw: string): TableRow => ({
  kind: "error",
  lineNumber,
  raw,
  errorMessage: msg,
});

const sampleRows: readonly TableRow[] = [
  okRow(1, { name: { raw: "Alice", display: "Alice" }, age: { raw: 30, display: "30" } }),
  okRow(2, { name: { raw: "Bob", display: "Bob" }, age: { raw: 25, display: "25" } }),
  errorRow(3, "Unexpected token", '{ invalid json }'),
  okRow(4, { name: { raw: "Charlie", display: "Charlie" }, age: { raw: 35, display: "35" } }),
  okRow(5, { name: { raw: "alice jones", display: "alice jones" }, age: { raw: 28, display: "28" } }),
];

describe("searchRows (client-side)", () => {
  it("returns all indices for empty query", () => {
    const result = searchRows(sampleRows, "");
    expect(result.matchedIndices).toEqual([0, 1, 2, 3, 4]);
    expect(result.matchCount).toBe(5);
  });

  it("filters by cell display value", () => {
    const result = searchRows(sampleRows, "Bob");
    expect(result.matchedIndices).toEqual([1]);
    expect(result.matchCount).toBe(1);
  });

  it("is case-insensitive", () => {
    const result = searchRows(sampleRows, "alice");
    expect(result.matchedIndices).toEqual([0, 4]);
    expect(result.matchCount).toBe(2);
  });

  it("matches error row errorMessage", () => {
    const result = searchRows(sampleRows, "Unexpected");
    expect(result.matchedIndices).toEqual([2]);
  });

  it("matches error row raw text", () => {
    const result = searchRows(sampleRows, "invalid json");
    expect(result.matchedIndices).toEqual([2]);
  });

  it("matches partial values", () => {
    const result = searchRows(sampleRows, "li");
    // "Alice" (0), error "invalid" (2), "Charlie" (3), "alice jones" (4)
    expect(result.matchedIndices).toEqual([0, 2, 3, 4]);
  });

  it("returns matchMap showing which cells matched", () => {
    const result = searchRows(sampleRows, "25");
    expect(result.matchedIndices).toEqual([1]);
    expect(result.matchMap.get(1)).toEqual(new Set(["age"]));
  });

  it("matchMap includes all matching cells for a row", () => {
    const rows: readonly TableRow[] = [
      okRow(1, { a: { raw: "x", display: "x" }, b: { raw: "x", display: "x" } }),
    ];
    const result = searchRows(rows, "x");
    expect(result.matchMap.get(0)).toEqual(new Set(["a", "b"]));
  });

  it("matchMap is empty for error rows that match", () => {
    const result = searchRows(sampleRows, "Unexpected");
    // Error rows don't have cell keys
    expect(result.matchMap.get(2)).toBeUndefined();
  });

  it("escapes regex special characters", () => {
    const rows: readonly TableRow[] = [
      okRow(1, { val: { raw: "a.b", display: "a.b" } }),
      okRow(2, { val: { raw: "axb", display: "axb" } }),
    ];
    const result = searchRows(rows, "a.b");
    expect(result.matchedIndices).toEqual([0]);
  });

  it("returns empty result for no matches", () => {
    const result = searchRows(sampleRows, "zzz_no_match");
    expect(result.matchedIndices).toEqual([]);
    expect(result.matchCount).toBe(0);
  });
});
