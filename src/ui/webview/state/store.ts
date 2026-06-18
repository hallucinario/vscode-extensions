import type { TableData, TableRow } from "../types.js";

export type WebviewState = {
  data: TableData | undefined;
  displayedRows: readonly TableRow[];
  sortColumn: string | undefined;
  sortAsc: boolean;
  selectedRowIndex: number;
  searchQuery: string;
  columnWidths: Record<string, number>;
  detailOpen: boolean;
  scrollTop: number;
  expandedRows: ReadonlySet<number>;
};

export type StoreAction =
  | { type: "setData"; data: TableData }
  | { type: "setDisplayedRows"; rows: readonly TableRow[] }
  | { type: "setSort"; column: string; asc: boolean }
  | { type: "setSearch"; query: string }
  | { type: "selectRow"; index: number }
  | { type: "setColumnWidth"; key: string; width: number }
  | { type: "setDetailOpen"; open: boolean }
  | { type: "setScrollTop"; scrollTop: number }
  | { type: "toggleRowExpanded"; index: number }
  | { type: "collapseAllRows" };

type Listener = (state: WebviewState) => void;

export type Store = {
  getState(): WebviewState;
  dispatch(action: StoreAction): void;
  subscribe(listener: Listener): () => void;
};

function initialState(): WebviewState {
  return {
    data: undefined,
    displayedRows: [],
    sortColumn: undefined,
    sortAsc: true,
    selectedRowIndex: -1,
    searchQuery: "",
    columnWidths: {},
    detailOpen: false,
    scrollTop: 0,
    expandedRows: new Set(),
  };
}

function reduce(state: WebviewState, action: StoreAction): WebviewState {
  switch (action.type) {
    case "setData":
      return {
        ...state,
        data: action.data,
        displayedRows: action.data.rows,
        sortColumn: undefined,
        sortAsc: true,
        selectedRowIndex: -1,
        searchQuery: "",
        expandedRows: new Set(),
      };
    case "setDisplayedRows":
      return { ...state, displayedRows: action.rows };
    case "setSort":
      return { ...state, sortColumn: action.column, sortAsc: action.asc };
    case "setSearch":
      return { ...state, searchQuery: action.query };
    case "selectRow":
      return { ...state, selectedRowIndex: action.index };
    case "setColumnWidth":
      return {
        ...state,
        columnWidths: { ...state.columnWidths, [action.key]: action.width },
      };
    case "setDetailOpen":
      return { ...state, detailOpen: action.open };
    case "setScrollTop":
      return { ...state, scrollTop: action.scrollTop };
    case "toggleRowExpanded": {
      const next = new Set(state.expandedRows);
      if (next.has(action.index)) {
        next.delete(action.index);
      } else {
        next.add(action.index);
      }
      return { ...state, expandedRows: next };
    }
    case "collapseAllRows":
      return { ...state, expandedRows: new Set() };
  }
}

export function createStore(): Store {
  let state = initialState();
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    dispatch(action: StoreAction) {
      state = reduce(state, action);
      for (const listener of listeners) {
        listener(state);
      }
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
