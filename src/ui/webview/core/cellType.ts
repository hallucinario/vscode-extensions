export type CellType = "string" | "number" | "boolean" | "null" | "object" | "array" | "empty";

export function getCellType(raw: unknown): CellType {
  if (raw === undefined) return "empty";
  if (raw === null) return "null";
  if (Array.isArray(raw)) return "array";
  if (typeof raw === "object") return "object";
  if (typeof raw === "string") return "string";
  if (typeof raw === "number") return "number";
  if (typeof raw === "boolean") return "boolean";
  return "string";
}
