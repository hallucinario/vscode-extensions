import { describe, it, expect } from "vitest";
import { buildTreeFromLine, buildTree } from "./treeBuilder.js";
import type { ParsedLine } from "./types.js";

describe("buildTreeFromLine", () => {
  it("creates entry node with children for each key of an ok object line", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"id":1,"name":"Alice"}',
      data: { id: 1, name: "Alice" },
    };
    const node = buildTreeFromLine(line);
    expect(node.contextValue).toBe("entry");
    expect(node.children).toHaveLength(2);
    expect(node.collapsible).toBe(true);
  });

  it("creates nested children for nested objects", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"user":{"name":"Bob","age":30}}',
      data: { user: { name: "Bob", age: 30 } },
    };
    const node = buildTreeFromLine(line);
    expect(node.children).toHaveLength(1);
    const userChild = node.children[0];
    expect(userChild.children.length).toBeGreaterThanOrEqual(2);
  });

  it("creates arrayItem children for array properties with indexed labels", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"tags":["a","b","c"]}',
      data: { tags: ["a", "b", "c"] },
    };
    const node = buildTreeFromLine(line);
    const tagsChild = node.children[0];
    expect(tagsChild.children).toHaveLength(3);
    tagsChild.children.forEach((child, i) => {
      expect(child.contextValue).toBe("arrayItem");
      expect(child.label).toContain(`[${i}]`);
    });
  });

  it("creates leaf node for null property with no children", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"value":null}',
      data: { value: null },
    };
    const node = buildTreeFromLine(line);
    const valueChild = node.children[0];
    expect(valueChild.children).toHaveLength(0);
    expect(valueChild.collapsible).toBe(false);
  });

  it("creates leaf entry node for primitive root (number)", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: "42",
      data: 42,
    };
    const node = buildTreeFromLine(line);
    expect(node.contextValue).toBe("entry");
    expect(node.children).toHaveLength(0);
    expect(node.collapsible).toBe(false);
  });

  it("creates error node for error lines with no children", () => {
    const line: ParsedLine = {
      kind: "error",
      lineNumber: 3,
      raw: "{bad}",
      errorMessage: "Unexpected token",
    };
    const node = buildTreeFromLine(line);
    expect(node.contextValue).toBe("error");
    expect(node.children).toHaveLength(0);
    expect(node.collapsible).toBe(false);
  });

  it("includes 1-based Line N in the label", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 5,
      raw: '{"x":1}',
      data: { x: 1 },
    };
    const node = buildTreeFromLine(line);
    expect(node.label).toContain("Line 5");
  });

  it("has a description that summarizes the data", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"id":1}',
      data: { id: 1 },
    };
    const node = buildTreeFromLine(line);
    expect(node.description).toBeDefined();
    expect(typeof node.description).toBe("string");
    expect(node.description!.length).toBeGreaterThan(0);
  });

  it("contains raw JSON string in value property", () => {
    const raw = '{"id":1,"name":"Alice"}';
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw,
      data: { id: 1, name: "Alice" },
    };
    const node = buildTreeFromLine(line);
    expect(node.value).toBe(raw);
  });

  it("preserves lineNumber from input", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 42,
      raw: '{"x":1}',
      data: { x: 1 },
    };
    const node = buildTreeFromLine(line);
    expect(node.lineNumber).toBe(42);
  });

  it("handles boolean root value", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: "true",
      data: true,
    };
    const node = buildTreeFromLine(line);
    expect(node.contextValue).toBe("entry");
    expect(node.children).toHaveLength(0);
  });
});

describe("buildTree", () => {
  it("returns array of TreeNodes, one per line", () => {
    const lines: ParsedLine[] = [
      { kind: "ok", lineNumber: 1, raw: '{"a":1}', data: { a: 1 } },
      { kind: "ok", lineNumber: 2, raw: '{"b":2}', data: { b: 2 } },
      { kind: "ok", lineNumber: 3, raw: '{"c":3}', data: { c: 3 } },
    ];
    const result = buildTree(lines);
    expect(result).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    const result = buildTree([]);
    expect(result).toHaveLength(0);
  });

  it("produces correct contextValues for mixed ok and error lines", () => {
    const lines: ParsedLine[] = [
      { kind: "ok", lineNumber: 1, raw: '{"a":1}', data: { a: 1 } },
      { kind: "error", lineNumber: 2, raw: "{bad}", errorMessage: "parse error" },
      { kind: "ok", lineNumber: 3, raw: '{"c":3}', data: { c: 3 } },
    ];
    const result = buildTree(lines);
    expect(result[0].contextValue).toBe("entry");
    expect(result[1].contextValue).toBe("error");
    expect(result[2].contextValue).toBe("entry");
  });
});
