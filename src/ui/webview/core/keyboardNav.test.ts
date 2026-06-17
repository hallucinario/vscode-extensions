import { describe, it, expect, vi } from "vitest";
import { handleKeydown, type KeyNavContext } from "./keyboardNav.js";

function makeContext(overrides: Partial<KeyNavContext> = {}): KeyNavContext {
  return {
    rowCount: 100,
    selectedIndex: -1,
    visibleRowCount: 10,
    detailOpen: false,
    onSelect: vi.fn(),
    onToggleDetail: vi.fn(),
    onFocusSearch: vi.fn(),
    onCopyRow: vi.fn(),
    ...overrides,
  };
}

describe("handleKeydown", () => {
  it("ArrowDown selects next row", () => {
    const ctx = makeContext({ selectedIndex: 5 });
    handleKeydown("ArrowDown", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(6);
  });

  it("ArrowDown from -1 selects first row", () => {
    const ctx = makeContext({ selectedIndex: -1 });
    handleKeydown("ArrowDown", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(0);
  });

  it("ArrowDown does not exceed last row", () => {
    const ctx = makeContext({ selectedIndex: 99, rowCount: 100 });
    handleKeydown("ArrowDown", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(99);
  });

  it("ArrowUp selects previous row", () => {
    const ctx = makeContext({ selectedIndex: 5 });
    handleKeydown("ArrowUp", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(4);
  });

  it("ArrowUp does not go below 0", () => {
    const ctx = makeContext({ selectedIndex: 0 });
    handleKeydown("ArrowUp", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(0);
  });

  it("Home selects first row", () => {
    const ctx = makeContext({ selectedIndex: 50 });
    handleKeydown("Home", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(0);
  });

  it("End selects last row", () => {
    const ctx = makeContext({ selectedIndex: 5, rowCount: 100 });
    handleKeydown("End", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(99);
  });

  it("PageDown moves by visibleRowCount", () => {
    const ctx = makeContext({ selectedIndex: 5, visibleRowCount: 10, rowCount: 100 });
    handleKeydown("PageDown", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(15);
  });

  it("PageDown clamps to last row", () => {
    const ctx = makeContext({ selectedIndex: 95, visibleRowCount: 10, rowCount: 100 });
    handleKeydown("PageDown", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(99);
  });

  it("PageUp moves back by visibleRowCount", () => {
    const ctx = makeContext({ selectedIndex: 15, visibleRowCount: 10 });
    handleKeydown("PageUp", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(5);
  });

  it("PageUp clamps to 0", () => {
    const ctx = makeContext({ selectedIndex: 3, visibleRowCount: 10 });
    handleKeydown("PageUp", false, ctx);
    expect(ctx.onSelect).toHaveBeenCalledWith(0);
  });

  it("Enter opens detail panel", () => {
    const ctx = makeContext({ selectedIndex: 5, detailOpen: false });
    handleKeydown("Enter", false, ctx);
    expect(ctx.onToggleDetail).toHaveBeenCalledWith(true);
  });

  it("Escape closes detail panel when open", () => {
    const ctx = makeContext({ detailOpen: true });
    handleKeydown("Escape", false, ctx);
    expect(ctx.onToggleDetail).toHaveBeenCalledWith(false);
  });

  it("Escape does not trigger when detail is closed", () => {
    const ctx = makeContext({ detailOpen: false });
    const result = handleKeydown("Escape", false, ctx);
    expect(ctx.onToggleDetail).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("Cmd+F (meta) focuses search", () => {
    const ctx = makeContext();
    handleKeydown("f", true, ctx);
    expect(ctx.onFocusSearch).toHaveBeenCalled();
  });

  it("Cmd+C (meta) copies selected row", () => {
    const ctx = makeContext({ selectedIndex: 3 });
    handleKeydown("c", true, ctx);
    expect(ctx.onCopyRow).toHaveBeenCalledWith(3);
  });

  it("Cmd+C does nothing with no selection", () => {
    const ctx = makeContext({ selectedIndex: -1 });
    handleKeydown("c", true, ctx);
    expect(ctx.onCopyRow).not.toHaveBeenCalled();
  });

  it("returns false for unhandled keys", () => {
    const ctx = makeContext();
    const result = handleKeydown("a", false, ctx);
    expect(result).toBe(false);
  });

  it("does nothing when rowCount is 0", () => {
    const ctx = makeContext({ rowCount: 0 });
    handleKeydown("ArrowDown", false, ctx);
    expect(ctx.onSelect).not.toHaveBeenCalled();
  });
});
