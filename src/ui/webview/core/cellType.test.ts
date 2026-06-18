import { describe, it, expect } from "vitest";
import { getCellType } from "./cellType.js";

describe("getCellType", () => {
  it('returns "string" for string values', () => {
    expect(getCellType("hello")).toBe("string");
  });

  it('returns "number" for number values', () => {
    expect(getCellType(42)).toBe("number");
    expect(getCellType(0)).toBe("number");
    expect(getCellType(-1.5)).toBe("number");
  });

  it('returns "boolean" for boolean values', () => {
    expect(getCellType(true)).toBe("boolean");
    expect(getCellType(false)).toBe("boolean");
  });

  it('returns "null" for null', () => {
    expect(getCellType(null)).toBe("null");
  });

  it('returns "object" for plain objects', () => {
    expect(getCellType({ a: 1 })).toBe("object");
    expect(getCellType({})).toBe("object");
  });

  it('returns "array" for arrays', () => {
    expect(getCellType([1, 2])).toBe("array");
    expect(getCellType([])).toBe("array");
  });

  it('returns "empty" for undefined', () => {
    expect(getCellType(undefined)).toBe("empty");
  });
});
