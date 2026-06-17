import type { JsonValue } from "./types.js";

export function summarizeValue(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value.length > 40) {
      return `"${value.slice(0, 40)}…"`;
    }
    return `"${value}"`;
  }
  if (Array.isArray(value)) return `Array[${value.length}]`;
  if (typeof value === "object") return `Object{${Object.keys(value).length}}`;
  return String(value);
}

export function summarizeLine(data: JsonValue, maxKeys: number = 3, maxLength: number = 80): string {
  if (data === null) return "null";
  if (typeof data === "boolean") return String(data);
  if (typeof data === "number") return String(data);
  if (typeof data === "string") return `"${data}"`;
  if (Array.isArray(data)) return `Array[${data.length}]`;

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) return "{ }";

    const shownKeys = keys.slice(0, maxKeys);
    const obj = data as Record<string, JsonValue>;
    const entries = shownKeys.map((k) => `${k}: ${summarizeValue(obj[k])}`);
    const hasMore = keys.length > maxKeys;
    const inner = entries.join(", ") + (hasMore ? ", ..." : "");
    let result = `{ ${inner} }`;

    if (result.length > maxLength) {
      result = result.slice(0, maxLength - 1) + "…";
    }

    return result;
  }

  return String(data);
}
