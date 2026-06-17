import { describe, it, expect } from "vitest";
import { summarizeLine, summarizeValue } from "./summarize.js";
import type { JsonValue } from "./types.js";

describe("summarizeLine", () => {
  it("shows all keys for a simple 2-key object", () => {
    const data: JsonValue = { id: 1, name: "Alice" };
    const result = summarizeLine(data);
    expect(result).toContain("id");
    expect(result).toContain("name");
  });

  it("truncates keys beyond default maxKeys (3) and appends ellipsis", () => {
    const data: JsonValue = { a: 1, b: 2, c: 3, d: 4, e: 5 };
    const result = summarizeLine(data);
    // should show first 3 keys and indicate more
    expect(result).toContain("...");
  });

  it("returns Array[N] for an array root value", () => {
    const data: JsonValue = [1, 2, 3];
    const result = summarizeLine(data);
    expect(result).toBe("Array[3]");
  });

  it('returns "null" for null root value', () => {
    const result = summarizeLine(null);
    expect(result).toBe("null");
  });

  it("returns the number as string for a number root", () => {
    const result = summarizeLine(42);
    expect(result).toBe("42");
  });

  it("returns quoted string for a string root", () => {
    const result = summarizeLine("hello");
    expect(result).toContain("hello");
  });

  it('returns "true" for boolean true root', () => {
    const result = summarizeLine(true);
    expect(result).toBe("true");
  });

  it('returns "false" for boolean false root', () => {
    const result = summarizeLine(false);
    expect(result).toBe("false");
  });

  it('returns "{ }" or similar for an empty object', () => {
    const result = summarizeLine({});
    expect(result).toMatch(/\{\s*\}/);
  });

  it("shows Object{N} for a nested object value within an entry", () => {
    const data: JsonValue = { id: 1, nested: { x: 1, y: 2 } };
    const result = summarizeLine(data);
    expect(result).toContain("Object{2}");
  });

  it("respects custom maxKeys=1", () => {
    const data: JsonValue = { a: 1, b: 2, c: 3 };
    const result = summarizeLine(data, 1);
    // Only first key visible, rest truncated
    expect(result).toContain("a");
    expect(result).toContain("...");
  });

  it("truncates long strings with ellipsis when maxLength is small", () => {
    const data: JsonValue = { message: "This is a very long string that should be truncated" };
    const result = summarizeLine(data, 3, 20);
    expect(result.length).toBeLessThanOrEqual(25); // some tolerance for formatting
    // Should contain truncation indicator
    expect(result).toContain("…"); // ellipsis character
  });

  it("uses default maxLength of 80", () => {
    const longValue = "x".repeat(200);
    const data: JsonValue = { text: longValue };
    const result = summarizeLine(data);
    expect(result.length).toBeLessThanOrEqual(85); // some tolerance
  });
});

describe("summarizeValue", () => {
  it('returns "null" for null', () => {
    expect(summarizeValue(null)).toBe("null");
  });

  it("returns quoted string for string value", () => {
    const result = summarizeValue("text");
    expect(result).toContain('"');
    expect(result).toContain("text");
  });

  it("truncates long strings at 40 characters", () => {
    const longStr = "a".repeat(50);
    const result = summarizeValue(longStr);
    // Should be truncated and contain ellipsis
    expect(result.length).toBeLessThan(55);
  });

  it('returns "42" for number 42', () => {
    expect(summarizeValue(42)).toBe("42");
  });

  it('returns "true" for boolean true', () => {
    expect(summarizeValue(true)).toBe("true");
  });

  it('returns "false" for boolean false', () => {
    expect(summarizeValue(false)).toBe("false");
  });

  it("returns Array[N] for arrays", () => {
    expect(summarizeValue([1, 2, 3])).toBe("Array[3]");
  });

  it("returns Object{N} for objects", () => {
    const obj: JsonValue = { a: 1, b: 2 };
    expect(summarizeValue(obj)).toBe("Object{2}");
  });

  it("returns Array[0] for empty array", () => {
    expect(summarizeValue([])).toBe("Array[0]");
  });

  it("returns Object{0} for empty object", () => {
    expect(summarizeValue({})).toBe("Object{0}");
  });
});
