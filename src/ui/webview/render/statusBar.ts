export type StatusInfo = {
  shownCount: number;
  totalRows: number;
  errorCount: number;
  totalLines: number;
  searchQuery: string;
};

export function formatStatus(info: StatusInfo): string {
  const { shownCount, totalRows, errorCount, totalLines, searchQuery } = info;
  let text = `${shownCount} rows`;
  if (searchQuery && shownCount !== totalRows) {
    text += ` (filtered from ${totalRows})`;
  }
  if (errorCount > 0) {
    text += ` · ${errorCount} error${errorCount > 1 ? "s" : ""}`;
  }
  text += ` · ${totalLines} total lines`;
  return text;
}
