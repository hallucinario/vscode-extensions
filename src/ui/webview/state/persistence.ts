export const PERSISTENCE_VERSION = 1;

export type PersistedState = {
  scrollTop: number;
  selectedRowIndex: number;
  sortColumn: string | undefined;
  sortAsc: boolean;
  searchQuery: string;
  columnWidths: Record<string, number>;
  detailOpen: boolean;
};

type VscodeApi = {
  getState(): unknown;
  setState(state: unknown): void;
};

type VersionedState = PersistedState & { version: number };

export type Persistence = {
  save(state: PersistedState): void;
  restore(): PersistedState | null;
};

export function createPersistence(api: VscodeApi): Persistence {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    save(state: PersistedState) {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        api.setState({ version: PERSISTENCE_VERSION, ...state });
      }, 200);
    },

    restore(): PersistedState | null {
      const raw = api.getState();
      if (raw === null || raw === undefined || typeof raw !== "object") {
        return null;
      }
      const obj = raw as Record<string, unknown>;
      if (obj.version !== PERSISTENCE_VERSION) {
        return null;
      }
      const versioned = raw as VersionedState;
      return {
        scrollTop: versioned.scrollTop,
        selectedRowIndex: versioned.selectedRowIndex,
        sortColumn: versioned.sortColumn,
        sortAsc: versioned.sortAsc,
        searchQuery: versioned.searchQuery,
        columnWidths: versioned.columnWidths,
        detailOpen: versioned.detailOpen,
      };
    },
  };
}
