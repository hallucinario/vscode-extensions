export type VisibleRange = {
  readonly start: number;
  readonly end: number;
};

export type VirtualScrollConfig = {
  readonly scrollTop: number;
  readonly containerHeight: number;
  readonly rowHeight: number;
  readonly totalCount: number;
  readonly overscan: number;
};

export function computeVisibleRange(config: VirtualScrollConfig): VisibleRange {
  const { scrollTop, containerHeight, rowHeight, totalCount, overscan } = config;
  if (totalCount === 0) return { start: 0, end: 0 };

  const rawStart = Math.floor(scrollTop / rowHeight);
  const rawEnd = Math.ceil((scrollTop + containerHeight) / rowHeight);

  const start = Math.max(0, rawStart - overscan);
  const end = Math.min(totalCount, rawEnd + overscan);

  return { start, end };
}

export function computeRowTop(index: number, rowHeight: number): number {
  return index * rowHeight;
}

export function computeSentinelHeight(totalCount: number, rowHeight: number): number {
  return totalCount * rowHeight;
}

export function computeScrollTopForIndex(index: number, rowHeight: number): number {
  return index * rowHeight;
}

// --- Variable-height functions (for expandable rows) ---

function countBefore(sortedIndices: readonly number[], target: number): number {
  let lo = 0;
  let hi = sortedIndices.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedIndices[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function computeRowTopVar(
  index: number,
  rowHeight: number,
  expansionHeight: number,
  expandedIndices: readonly number[],
): number {
  const expandedBefore = countBefore(expandedIndices, index);
  return index * rowHeight + expandedBefore * expansionHeight;
}

export function computeRowHeight(
  index: number,
  rowHeight: number,
  expansionHeight: number,
  expandedSet: ReadonlySet<number>,
): number {
  return expandedSet.has(index) ? rowHeight + expansionHeight : rowHeight;
}

export function computeSentinelHeightVar(
  totalCount: number,
  rowHeight: number,
  expansionHeight: number,
  expandedCount: number,
): number {
  return totalCount * rowHeight + expandedCount * expansionHeight;
}

export function findRowAtScrollTop(
  scrollTop: number,
  totalCount: number,
  rowHeight: number,
  expansionHeight: number,
  expandedIndices: readonly number[],
): number {
  if (totalCount === 0) return 0;
  let lo = 0;
  let hi = totalCount - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const top = computeRowTopVar(mid, rowHeight, expansionHeight, expandedIndices);
    if (top + rowHeight <= scrollTop) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
