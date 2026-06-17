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
