import { describe, it, expect } from "vitest";
import { sortRows } from "./sort.js";
import type { TableRow } from "../types.js";

const okRow = (lineNumber: number, cells: Record<string, { raw: unknown; display: string }>): TableRow => ({
  kind: "ok",
  lineNumber,
  cells,
});

const errorRow = (lineNumber: number): TableRow => ({
  kind: "error",
  lineNumber,
  raw: "bad",
  errorMessage: "parse error",
});

describe("sortRows", () => {
  const rows: readonly TableRow[] = [
    okRow(1, { name: { raw: "Charlie", display: "Charlie" }, age: { raw: 35, display: "35" } }),
    okRow(2, { name: { raw: "Alice", display: "Alice" }, age: { raw: 30, display: "30" } }),
    okRow(3, { name: { raw: "Bob", display: "Bob" }, age: { raw: 25, display: "25" } }),
  ];

  it("sorts by string column ascending", () => {
    const sorted = sortRows(rows, "name", true);
    expect(sorted.map(r => r.lineNumber)).toEqual([2, 3, 1]);
  });

  it("sorts by string column descending", () => {
    const sorted = sortRows(rows, "name", false);
    expect(sorted.map(r => r.lineNumber)).toEqual([1, 3, 2]);
  });

  it("sorts by numeric column ascending", () => {
    const sorted = sortRows(rows, "age", true);
    expect(sorted.map(r => r.lineNumber)).toEqual([3, 2, 1]);
  });

  it("sorts by numeric column descending", () => {
    const sorted = sortRows(rows, "age", false);
    expect(sorted.map(r => r.lineNumber)).toEqual([1, 2, 3]);
  });

  it("keeps error rows at the bottom", () => {
    const mixed: readonly TableRow[] = [
      errorRow(1),
      okRow(2, { name: { raw: "Alice", display: "Alice" } }),
      errorRow(3),
      okRow(4, { name: { raw: "Bob", display: "Bob" } }),
    ];
    const sorted = sortRows(mixed, "name", true);
    expect(sorted.map(r => r.lineNumber)).toEqual([2, 4, 1, 3]);
  });

  it("sorts error rows among themselves by lineNumber", () => {
    const mixed: readonly TableRow[] = [
      errorRow(5),
      errorRow(2),
      okRow(1, { name: { raw: "A", display: "A" } }),
    ];
    const sorted = sortRows(mixed, "name", true);
    expect(sorted.map(r => r.lineNumber)).toEqual([1, 2, 5]);
  });

  it("handles empty cells — puts them after non-empty", () => {
    const withEmpty: readonly TableRow[] = [
      okRow(1, { name: { raw: "Bob", display: "Bob" } }),
      okRow(2, { name: { raw: undefined, display: "" } }),
      okRow(3, { name: { raw: "Alice", display: "Alice" } }),
    ];
    const sorted = sortRows(withEmpty, "name", true);
    expect(sorted.map(r => r.lineNumber)).toEqual([3, 1, 2]);
  });

  it("handles missing column key gracefully", () => {
    const withMissing: readonly TableRow[] = [
      okRow(1, { name: { raw: "Bob", display: "Bob" } }),
      okRow(2, {}),
    ];
    const sorted = sortRows(withMissing, "name", true);
    expect(sorted.map(r => r.lineNumber)).toEqual([1, 2]);
  });

  it("is stable — equal values preserve lineNumber order", () => {
    const same: readonly TableRow[] = [
      okRow(3, { val: { raw: "x", display: "x" } }),
      okRow(1, { val: { raw: "x", display: "x" } }),
      okRow(2, { val: { raw: "x", display: "x" } }),
    ];
    const sorted = sortRows(same, "val", true);
    expect(sorted.map(r => r.lineNumber)).toEqual([1, 2, 3]);
  });

  it("does not mutate the original array", () => {
    const original = [...rows];
    sortRows(rows, "name", true);
    expect(rows.map(r => r.lineNumber)).toEqual(original.map(r => r.lineNumber));
  });
});
