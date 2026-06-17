import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPersistence, PERSISTENCE_VERSION, type PersistedState } from "./persistence.js";

function mockVscodeApi() {
  let stored: unknown = undefined;
  return {
    getState: vi.fn(() => stored),
    setState: vi.fn((s: unknown) => { stored = s; }),
    postMessage: vi.fn(),
  };
}

describe("createPersistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("save calls setState with version and data", () => {
    const api = mockVscodeApi();
    const persistence = createPersistence(api);
    const state: PersistedState = {
      scrollTop: 100,
      selectedRowIndex: 2,
      sortColumn: "id",
      sortAsc: false,
      searchQuery: "hello",
      columnWidths: { id: 120 },
      detailOpen: true,
    };
    persistence.save(state);
    vi.advanceTimersByTime(200);
    expect(api.setState).toHaveBeenCalledWith({
      version: PERSISTENCE_VERSION,
      ...state,
    });
  });

  it("restore returns persisted state when version matches", () => {
    const api = mockVscodeApi();
    const persisted = {
      version: PERSISTENCE_VERSION,
      scrollTop: 50,
      selectedRowIndex: 3,
      sortColumn: "name",
      sortAsc: true,
      searchQuery: "x",
      columnWidths: { name: 200 },
      detailOpen: false,
    };
    api.setState(persisted);
    const persistence = createPersistence(api);
    const result = persistence.restore();
    expect(result).toEqual({
      scrollTop: 50,
      selectedRowIndex: 3,
      sortColumn: "name",
      sortAsc: true,
      searchQuery: "x",
      columnWidths: { name: 200 },
      detailOpen: false,
    });
  });

  it("restore returns null when getState returns null", () => {
    const api = mockVscodeApi();
    const persistence = createPersistence(api);
    expect(persistence.restore()).toBeNull();
  });

  it("restore returns null on version mismatch", () => {
    const api = mockVscodeApi();
    api.setState({ version: -999, scrollTop: 0 });
    const persistence = createPersistence(api);
    expect(persistence.restore()).toBeNull();
  });

  it("restore returns null when stored data is not an object", () => {
    const api = mockVscodeApi();
    api.setState("invalid");
    const persistence = createPersistence(api);
    expect(persistence.restore()).toBeNull();
  });

  it("debounces save — only last call within 200ms fires", () => {
    const api = mockVscodeApi();
    const persistence = createPersistence(api);
    persistence.save({ scrollTop: 1, selectedRowIndex: -1, sortColumn: undefined, sortAsc: true, searchQuery: "", columnWidths: {}, detailOpen: false });
    persistence.save({ scrollTop: 2, selectedRowIndex: -1, sortColumn: undefined, sortAsc: true, searchQuery: "", columnWidths: {}, detailOpen: false });
    persistence.save({ scrollTop: 3, selectedRowIndex: -1, sortColumn: undefined, sortAsc: true, searchQuery: "", columnWidths: {}, detailOpen: false });
    expect(api.setState).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(api.setState).toHaveBeenCalledTimes(1);
    expect(api.setState).toHaveBeenCalledWith(expect.objectContaining({ scrollTop: 3 }));
  });
});
