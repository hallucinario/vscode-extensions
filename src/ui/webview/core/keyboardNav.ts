export type KeyNavContext = {
  rowCount: number;
  selectedIndex: number;
  visibleRowCount: number;
  detailOpen: boolean;
  onSelect: (index: number) => void;
  onToggleDetail: (open: boolean) => void;
  onFocusSearch: () => void;
  onCopyRow: (index: number) => void;
};

export function handleKeydown(
  key: string,
  metaOrCtrl: boolean,
  ctx: KeyNavContext,
): boolean {
  if (metaOrCtrl) {
    if (key === "f") {
      ctx.onFocusSearch();
      return true;
    }
    if (key === "c" && ctx.selectedIndex >= 0) {
      ctx.onCopyRow(ctx.selectedIndex);
      return true;
    }
    return false;
  }

  if (ctx.rowCount === 0) return false;

  switch (key) {
    case "ArrowDown": {
      const next = Math.min(ctx.selectedIndex + 1, ctx.rowCount - 1);
      ctx.onSelect(Math.max(0, next));
      return true;
    }
    case "ArrowUp": {
      const prev = Math.max(0, ctx.selectedIndex - 1);
      ctx.onSelect(prev);
      return true;
    }
    case "Home":
      ctx.onSelect(0);
      return true;
    case "End":
      ctx.onSelect(ctx.rowCount - 1);
      return true;
    case "PageDown": {
      const target = Math.min(ctx.selectedIndex + ctx.visibleRowCount, ctx.rowCount - 1);
      ctx.onSelect(target);
      return true;
    }
    case "PageUp": {
      const target = Math.max(0, ctx.selectedIndex - ctx.visibleRowCount);
      ctx.onSelect(target);
      return true;
    }
    case "Enter":
      ctx.onToggleDetail(true);
      return true;
    case "Escape":
      if (ctx.detailOpen) {
        ctx.onToggleDetail(false);
        return true;
      }
      return false;
    default:
      return false;
  }
}
