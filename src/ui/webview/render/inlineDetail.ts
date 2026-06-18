import type { ParsedLine, JsonValue } from "../../../core/jsonl/types.js";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatPrimitive(value: JsonValue): string {
  if (value === null) return '<span class="json-null">null</span>';
  if (typeof value === "boolean") return `<span class="json-boolean">${value}</span>`;
  if (typeof value === "number") return `<span class="json-number">${value}</span>`;
  if (typeof value === "string") {
    const escaped = escapeHtml(value);
    if (value.length > 120) {
      return `<span class="json-string">"${escapeHtml(value.slice(0, 117))}…"</span>`;
    }
    return `<span class="json-string">"${escaped}"</span>`;
  }
  return escapeHtml(String(value));
}

function renderValue(value: JsonValue, key: string, depth: number): string {
  if (value === null || typeof value !== "object") {
    return `<div class="prop-row" style="padding-left:${depth * 16}px">
      <span class="prop-key">${escapeHtml(key)}</span>
      <span class="prop-sep">: </span>
      ${formatPrimitive(value)}
    </div>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `<div class="prop-row" style="padding-left:${depth * 16}px">
        <span class="prop-key">${escapeHtml(key)}</span>
        <span class="prop-sep">: </span>
        <span class="json-null">[]</span>
      </div>`;
    }
    const children = value.map((item, i) => renderValue(item, `[${i}]`, depth + 1)).join("");
    return `<details class="prop-tree" style="padding-left:${depth * 16}px">
      <summary>
        <span class="prop-key">${escapeHtml(key)}</span>
        <span class="type-indicator arr-indicator">[${value.length}]</span>
      </summary>
      ${children}
    </details>`;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return `<div class="prop-row" style="padding-left:${depth * 16}px">
      <span class="prop-key">${escapeHtml(key)}</span>
      <span class="prop-sep">: </span>
      <span class="json-null">{}</span>
    </div>`;
  }
  const children = entries.map(([k, v]) => renderValue(v, k, depth + 1)).join("");
  return `<details class="prop-tree" style="padding-left:${depth * 16}px">
    <summary>
      <span class="prop-key">${escapeHtml(key)}</span>
      <span class="type-indicator obj-indicator">{${entries.length}}</span>
    </summary>
    ${children}
  </details>`;
}

export function renderInlineDetailHtml(line: ParsedLine): string {
  if (line.kind === "error") {
    return `<div class="inline-detail-error">
      <div class="detail-error-msg">⚠ ${escapeHtml(line.errorMessage)}</div>
      <pre class="detail-raw">${escapeHtml(line.raw)}</pre>
    </div>`;
  }

  const data = line.data;
  if (data === null || typeof data !== "object") {
    return `<div class="prop-row">${formatPrimitive(data)}</div>`;
  }

  if (Array.isArray(data)) {
    return data.map((item, i) => renderValue(item, `[${i}]`, 0)).join("");
  }

  return Object.entries(data).map(([k, v]) => renderValue(v, k, 0)).join("");
}
