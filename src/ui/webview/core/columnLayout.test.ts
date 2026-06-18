import { describe, it, expect } from "vitest";
import { computeColumnWidth, computeTotalRowWidth, DEFAULT_COLUMN_WIDTH, autoFitColumnWidths, MIN_COL_WIDTH, MAX_COL_WIDTH, CHAR_WIDTH_PX, CELL_PADDING_PX } from "./columnLayout.js";
import type { TableRow, ColumnDef } from "../types.js";

describe("computeColumnWidth", () => {
  it("returns default when key not in map", () => {
    expect(computeColumnWidth("x", {})).toBe(DEFAULT_COLUMN_WIDTH);
  });

  it("returns stored width when key is in map", () => {
    expect(computeColumnWidth("x", { x: 200 })).toBe(200);
  });

  it("DEFAULT_COLUMN_WIDTH is 200", () => {
    expect(DEFAULT_COLUMN_WIDTH).toBe(200);
  });
});

describe("computeTotalRowWidth", () => {
  it("sums lineNumWidth + default widths for all columns", () => {
    const result = computeTotalRowWidth(40, [{ key: "a" }, { key: "b" }], {});
    expect(result).toBe(40 + DEFAULT_COLUMN_WIDTH + DEFAULT_COLUMN_WIDTH);
  });

  it("uses stored widths when available", () => {
    const result = computeTotalRowWidth(40, [{ key: "a" }, { key: "b" }], { a: 250 });
    expect(result).toBe(40 + 250 + DEFAULT_COLUMN_WIDTH);
  });

  it("returns lineNumWidth when no columns", () => {
    expect(computeTotalRowWidth(40, [], {})).toBe(40);
  });
});

const okRow = (cells: Record<string, { raw: unknown; display: string }>): TableRow => ({
  kind: "ok" as const,
  lineNumber: 1,
  cells: Object.fromEntries(
    Object.entries(cells).map(([k, v]) => [k, { raw: v.raw, display: v.display }]),
  ),
});

describe("autoFitColumnWidths", () => {
  const cols: ColumnDef[] = [{ key: "id", label: "id" }, { key: "name", label: "name" }];

  it("computes width from max display length in sample rows", () => {
    const rows: TableRow[] = [
      okRow({ id: { raw: 1, display: "1" }, name: { raw: "Alice", display: "Alice" } }),
      okRow({ id: { raw: 2, display: "2" }, name: { raw: "Bob Smith-Johnson", display: "Bob Smith-Johnson" } }),
    ];
    const widths = autoFitColumnWidths(rows, cols);
    expect(widths["name"]).toBeGreaterThan(widths["id"]);
  });

  it("clamps to MIN_COL_WIDTH for very short content", () => {
    const rows: TableRow[] = [
      okRow({ id: { raw: 1, display: "1" }, name: { raw: "A", display: "A" } }),
    ];
    const widths = autoFitColumnWidths(rows, cols);
    expect(widths["id"]).toBeGreaterThanOrEqual(MIN_COL_WIDTH);
    expect(widths["name"]).toBeGreaterThanOrEqual(MIN_COL_WIDTH);
  });

  it("clamps to MAX_COL_WIDTH for very long content", () => {
    const longStr = "x".repeat(200);
    const rows: TableRow[] = [
      okRow({ id: { raw: 1, display: "1" }, name: { raw: longStr, display: longStr } }),
    ];
    const widths = autoFitColumnWidths(rows, cols);
    expect(widths["name"]).toBeLessThanOrEqual(MAX_COL_WIDTH);
  });

  it("returns empty record for empty rows", () => {
    expect(autoFitColumnWidths([], cols)).toEqual({});
  });

  it("considers header label width", () => {
    const longLabel: ColumnDef[] = [{ key: "a", label: "very_long_column_name_here" }];
    const rows: TableRow[] = [
      okRow({ a: { raw: "x", display: "x" } }),
    ];
    const widths = autoFitColumnWidths(rows, longLabel);
    const expectedMin = "very_long_column_name_here".length * CHAR_WIDTH_PX + CELL_PADDING_PX;
    expect(widths["a"]).toBeGreaterThanOrEqual(expectedMin);
  });

  it("skips error rows", () => {
    const rows: TableRow[] = [
      { kind: "error", lineNumber: 1, raw: "bad", errorMessage: "err" },
      okRow({ id: { raw: 1, display: "1" }, name: { raw: "Alice", display: "Alice" } }),
    ];
    const widths = autoFitColumnWidths(rows, cols);
    expect(widths["id"]).toBeGreaterThanOrEqual(MIN_COL_WIDTH);
  });

  it("only samples first 100 rows", () => {
    const rows: TableRow[] = [];
    for (let i = 0; i < 150; i++) {
      const display = i === 120 ? "x".repeat(100) : "short";
      rows.push(okRow({ id: { raw: i, display: String(i) }, name: { raw: display, display } }));
    }
    const widths = autoFitColumnWidths(rows, cols);
    expect(widths["name"]).toBeLessThan(100 * CHAR_WIDTH_PX + CELL_PADDING_PX);
  });
});
