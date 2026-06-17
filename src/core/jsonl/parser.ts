import type { ParseResult, ParsedLine } from "./types.js";

export function parseJsonl(content: string): ParseResult {
  const rawLines = content.split("\n");
  const totalLines = rawLines.length;
  const lines: ParsedLine[] = [];
  let errorCount = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    if (raw.trim() === "") {
      continue;
    }
    const lineNumber = i + 1;
    try {
      const data = JSON.parse(raw);
      lines.push({ kind: "ok", lineNumber, raw, data });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      lines.push({ kind: "error", lineNumber, raw, errorMessage });
      errorCount++;
    }
  }

  return { lines, totalLines, errorCount };
}
