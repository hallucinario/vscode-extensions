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
