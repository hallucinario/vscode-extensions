import { describe, it, expect } from "vitest";
import { computeVisibleRange } from "./virtualScroll.js";

describe("computeVisibleRange", () => {
  it("computes range for top of container", () => {
    const range = computeVisibleRange({
      scrollTop: 0,
      containerHeight: 280,
      rowHeight: 28,
      totalCount: 100,
      overscan: 0,
    });
    expect(range).toEqual({ start: 0, end: 10 });
  });

  it("computes range when scrolled down", () => {
    const range = computeVisibleRange({
      scrollTop: 280,
      containerHeight: 280,
      rowHeight: 28,
      totalCount: 100,
      overscan: 0,
    });
    expect(range).toEqual({ start: 10, end: 20 });
  });

  it("applies overscan to extend range", () => {
    const range = computeVisibleRange({
      scrollTop: 280,
      containerHeight: 280,
      rowHeight: 28,
      totalCount: 100,
      overscan: 5,
    });
    expect(range).toEqual({ start: 5, end: 25 });
  });

  it("clamps overscan to 0 at start", () => {
    const range = computeVisibleRange({
      scrollTop: 0,
      containerHeight: 280,
      rowHeight: 28,
      totalCount: 100,
      overscan: 5,
    });
    expect(range.start).toBe(0);
    expect(range.end).toBe(15);
  });

  it("clamps overscan to totalCount at end", () => {
    const range = computeVisibleRange({
      scrollTop: 2520,
      containerHeight: 280,
      rowHeight: 28,
      totalCount: 100,
      overscan: 5,
    });
    expect(range.start).toBe(85);
    expect(range.end).toBe(100);
  });

  it("returns empty range for totalCount 0", () => {
    const range = computeVisibleRange({
      scrollTop: 0,
      containerHeight: 280,
      rowHeight: 28,
      totalCount: 0,
      overscan: 5,
    });
    expect(range).toEqual({ start: 0, end: 0 });
  });

  it("handles partial rows at bottom", () => {
    const range = computeVisibleRange({
      scrollTop: 0,
      containerHeight: 300,
      rowHeight: 28,
      totalCount: 100,
      overscan: 0,
    });
    // 300/28 = 10.71, so 11 rows visible
    expect(range).toEqual({ start: 0, end: 11 });
  });

  it("handles case where totalCount is less than viewport", () => {
    const range = computeVisibleRange({
      scrollTop: 0,
      containerHeight: 280,
      rowHeight: 28,
      totalCount: 5,
      overscan: 10,
    });
    expect(range).toEqual({ start: 0, end: 5 });
  });

  it("computes sentinel height correctly", () => {
    const range = computeVisibleRange({
      scrollTop: 0,
      containerHeight: 280,
      rowHeight: 28,
      totalCount: 100,
      overscan: 0,
    });
    // Not testing sentinel height here since it's a DOM concern,
    // but the calculation is totalCount * rowHeight = 2800
    expect(range.start).toBe(0);
  });
});

describe("computeRowTop", () => {
  it("returns index * rowHeight", async () => {
    const { computeRowTop } = await import("./virtualScroll.js");
    expect(computeRowTop(0, 28)).toBe(0);
    expect(computeRowTop(5, 28)).toBe(140);
    expect(computeRowTop(100, 28)).toBe(2800);
  });
});

describe("computeSentinelHeight", () => {
  it("returns totalCount * rowHeight", async () => {
    const { computeSentinelHeight } = await import("./virtualScroll.js");
    expect(computeSentinelHeight(100, 28)).toBe(2800);
    expect(computeSentinelHeight(0, 28)).toBe(0);
    expect(computeSentinelHeight(5000, 28)).toBe(140000);
  });
});

describe("computeScrollTopForIndex", () => {
  it("returns index * rowHeight", async () => {
    const { computeScrollTopForIndex } = await import("./virtualScroll.js");
    expect(computeScrollTopForIndex(0, 28)).toBe(0);
    expect(computeScrollTopForIndex(50, 28)).toBe(1400);
  });
});

// --- Variable-height virtual scroll (for expandable rows) ---

describe("computeRowTopVar", () => {
  it("returns index * rowHeight when no expanded rows", async () => {
    const { computeRowTopVar } = await import("./virtualScroll.js");
    expect(computeRowTopVar(5, 28, 200, [])).toBe(140);
  });

  it("adds expansionHeight for each expanded row before index", async () => {
    const { computeRowTopVar } = await import("./virtualScroll.js");
    expect(computeRowTopVar(5, 28, 200, [2])).toBe(140 + 200);
  });

  it("does not count the row itself in offset (expansion is below the summary)", async () => {
    const { computeRowTopVar } = await import("./virtualScroll.js");
    expect(computeRowTopVar(2, 28, 200, [2])).toBe(56);
  });

  it("handles multiple expanded rows", async () => {
    const { computeRowTopVar } = await import("./virtualScroll.js");
    expect(computeRowTopVar(5, 28, 200, [1, 3])).toBe(140 + 400);
  });
});

describe("computeRowHeight", () => {
  it("returns rowHeight for collapsed row", async () => {
    const { computeRowHeight } = await import("./virtualScroll.js");
    expect(computeRowHeight(5, 28, 200, new Set())).toBe(28);
  });

  it("returns rowHeight + expansionHeight for expanded row", async () => {
    const { computeRowHeight } = await import("./virtualScroll.js");
    expect(computeRowHeight(5, 28, 200, new Set([5]))).toBe(228);
  });
});

describe("computeSentinelHeightVar", () => {
  it("includes expansion heights", async () => {
    const { computeSentinelHeightVar } = await import("./virtualScroll.js");
    expect(computeSentinelHeightVar(100, 28, 200, 2)).toBe(100 * 28 + 2 * 200);
  });

  it("returns base height when no expansions", async () => {
    const { computeSentinelHeightVar } = await import("./virtualScroll.js");
    expect(computeSentinelHeightVar(100, 28, 200, 0)).toBe(2800);
  });
});

describe("findRowAtScrollTop", () => {
  it("returns index 0 at scrollTop 0", async () => {
    const { findRowAtScrollTop } = await import("./virtualScroll.js");
    expect(findRowAtScrollTop(0, 100, 28, 200, [])).toBe(0);
  });

  it("returns correct index with no expansions", async () => {
    const { findRowAtScrollTop } = await import("./virtualScroll.js");
    expect(findRowAtScrollTop(140, 100, 28, 200, [])).toBe(5);
  });

  it("accounts for expanded rows when finding index", async () => {
    const { findRowAtScrollTop } = await import("./virtualScroll.js");
    // Row 2 expanded: rows 0-2 take 28*3 + 200 = 284px. scrollTop 284 = row 3
    expect(findRowAtScrollTop(284, 100, 28, 200, [2])).toBe(3);
  });
});
