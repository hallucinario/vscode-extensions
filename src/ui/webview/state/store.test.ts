import { describe, it, expect, vi } from "vitest";
import { createStore } from "./store.js";
import type { TableData, TableRow } from "../../webview/types.js";

const makeTableData = (rowCount: number): TableData => ({
  columns: [{ key: "id", label: "id" }],
  rows: Array.from({ length: rowCount }, (_, i) => ({
    kind: "ok" as const,
    lineNumber: i + 1,
    cells: { id: { raw: i, display: String(i) } },
  })),
  totalLines: rowCount,
  errorCount: 0,
});

describe("createStore", () => {
  it("returns initial state with no data", () => {
    const store = createStore();
    const s = store.getState();
    expect(s.data).toBeUndefined();
    expect(s.displayedRows).toEqual([]);
    expect(s.sortColumn).toBeUndefined();
    expect(s.sortAsc).toBe(true);
    expect(s.selectedRowIndex).toBe(-1);
    expect(s.searchQuery).toBe("");
    expect(s.columnWidths).toEqual({});
    expect(s.detailOpen).toBe(false);
    expect(s.scrollTop).toBe(0);
  });

  it("dispatch setData updates data and displayedRows", () => {
    const store = createStore();
    const data = makeTableData(3);
    store.dispatch({ type: "setData", data });
    expect(store.getState().data).toBe(data);
    expect(store.getState().displayedRows).toBe(data.rows);
  });

  it("dispatch setData resets sort and selection", () => {
    const store = createStore();
    const data = makeTableData(3);
    store.dispatch({ type: "setData", data });
    store.dispatch({ type: "setSort", column: "id", asc: false });
    store.dispatch({ type: "selectRow", index: 1 });

    store.dispatch({ type: "setData", data: makeTableData(5) });
    expect(store.getState().sortColumn).toBeUndefined();
    expect(store.getState().sortAsc).toBe(true);
    expect(store.getState().selectedRowIndex).toBe(-1);
    expect(store.getState().searchQuery).toBe("");
  });

  it("dispatch setSort updates sort state", () => {
    const store = createStore();
    store.dispatch({ type: "setSort", column: "id", asc: false });
    expect(store.getState().sortColumn).toBe("id");
    expect(store.getState().sortAsc).toBe(false);
  });

  it("dispatch setSearch updates searchQuery", () => {
    const store = createStore();
    store.dispatch({ type: "setSearch", query: "hello" });
    expect(store.getState().searchQuery).toBe("hello");
  });

  it("dispatch selectRow updates selectedRowIndex", () => {
    const store = createStore();
    store.dispatch({ type: "selectRow", index: 5 });
    expect(store.getState().selectedRowIndex).toBe(5);
  });

  it("dispatch setColumnWidth updates a single column width", () => {
    const store = createStore();
    store.dispatch({ type: "setColumnWidth", key: "name", width: 200 });
    expect(store.getState().columnWidths).toEqual({ name: 200 });
    store.dispatch({ type: "setColumnWidth", key: "id", width: 80 });
    expect(store.getState().columnWidths).toEqual({ name: 200, id: 80 });
  });

  it("dispatch setDetailOpen updates detailOpen", () => {
    const store = createStore();
    store.dispatch({ type: "setDetailOpen", open: true });
    expect(store.getState().detailOpen).toBe(true);
    store.dispatch({ type: "setDetailOpen", open: false });
    expect(store.getState().detailOpen).toBe(false);
  });

  it("dispatch setScrollTop updates scrollTop", () => {
    const store = createStore();
    store.dispatch({ type: "setScrollTop", scrollTop: 1234 });
    expect(store.getState().scrollTop).toBe(1234);
  });

  it("dispatch setDisplayedRows updates displayedRows", () => {
    const store = createStore();
    const rows: readonly TableRow[] = [
      { kind: "ok", lineNumber: 1, cells: {} },
    ];
    store.dispatch({ type: "setDisplayedRows", rows });
    expect(store.getState().displayedRows).toBe(rows);
  });

  it("subscribe is called on every dispatch", () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: "setSearch", query: "x" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(store.getState());
    store.dispatch({ type: "selectRow", index: 0 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe stops notifications", () => {
    const store = createStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.dispatch({ type: "setSearch", query: "a" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    store.dispatch({ type: "setSearch", query: "b" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("multiple subscribers all receive updates", () => {
    const store = createStore();
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.dispatch({ type: "selectRow", index: 3 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
