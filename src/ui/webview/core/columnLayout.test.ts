import { describe, it, expect } from "vitest";
import { computeColumnWidth, computeTotalRowWidth, DEFAULT_COLUMN_WIDTH } from "./columnLayout.js";

describe("computeColumnWidth", () => {
  it("returns default when key not in map", () => {
    expect(computeColumnWidth("x", {})).toBe(DEFAULT_COLUMN_WIDTH);
  });

  it("returns stored width when key is in map", () => {
    expect(computeColumnWidth("x", { x: 200 })).toBe(200);
  });

  it("DEFAULT_COLUMN_WIDTH is 150", () => {
    expect(DEFAULT_COLUMN_WIDTH).toBe(150);
  });
});

describe("computeTotalRowWidth", () => {
  it("sums lineNumWidth + default widths for all columns", () => {
    const result = computeTotalRowWidth(40, [{ key: "a" }, { key: "b" }], {});
    expect(result).toBe(40 + 150 + 150);
  });

  it("uses stored widths when available", () => {
    const result = computeTotalRowWidth(40, [{ key: "a" }, { key: "b" }], { a: 200 });
    expect(result).toBe(40 + 200 + 150);
  });

  it("returns lineNumWidth when no columns", () => {
    expect(computeTotalRowWidth(40, [], {})).toBe(40);
  });
});
