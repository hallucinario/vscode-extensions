export function showEmptyState(container: HTMLElement): void {
  container.classList.remove("hidden");
}

export function hideEmptyState(container: HTMLElement): void {
  container.classList.add("hidden");
}

export function showLoading(
  container: HTMLElement,
  textEl: HTMLElement,
  fileName: string,
  lineCount: number,
): void {
  container.classList.remove("hidden");
  textEl.textContent = `Loading ${fileName}... (${lineCount.toLocaleString()} lines)`;
}

export function hideLoading(container: HTMLElement): void {
  container.classList.add("hidden");
}
