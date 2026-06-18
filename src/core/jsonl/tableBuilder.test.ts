import { describe, it, expect } from "vitest";
import { buildTable } from "./tableBuilder.js";
import type { ParseResult } from "./types.js";

describe("buildTable", () => {
  it("builds columns and rows from simple uniform data", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: '{"id":1,"name":"Alice"}', data: { id: 1, name: "Alice" } },
        { kind: "ok", lineNumber: 2, raw: '{"id":2,"name":"Bob"}', data: { id: 2, name: "Bob" } },
      ],
      totalLines: 2,
      errorCount: 0,
    };
    const table = buildTable(result);
    expect(table.columns.map((c) => c.key)).toEqual(expect.arrayContaining(["id", "name"]));
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].kind).toBe("ok");
  });

  it("detects columns as union of all keys from ok lines", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: '{"a":1}', data: { a: 1 } },
        { kind: "ok", lineNumber: 2, raw: '{"b":2}', data: { b: 2 } },
        { kind: "ok", lineNumber: 3, raw: '{"a":3,"c":4}', data: { a: 3, c: 4 } },
      ],
      totalLines: 3,
      errorCount: 0,
    };
    const table = buildTable(result);
    const keys = table.columns.map((c) => c.key);
    expect(keys).toContain("a");
    expect(keys).toContain("b");
    expect(keys).toContain("c");
  });

  it("sorts columns alphabetically", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: '{"z":1,"a":2,"m":3}', data: { z: 1, a: 2, m: 3 } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const keys = table.columns.map((c) => c.key);
    expect(keys).toEqual(["a", "m", "z"]);
  });

  it("uses empty display for missing keys in some rows", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: '{"a":1}', data: { a: 1 } },
        { kind: "ok", lineNumber: 2, raw: '{"b":2}', data: { b: 2 } },
      ],
      totalLines: 2,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row0 = table.rows[0];
    if (row0.kind === "ok") {
      // row 0 has "a" but not "b"
      expect(row0.cells["b"]?.display).toBe("");
    }
  });

  it("preserves error rows with kind, raw, and errorMessage", () => {
    const result: ParseResult = {
      lines: [
        { kind: "error", lineNumber: 1, raw: "{bad}", errorMessage: "parse error" },
      ],
      totalLines: 1,
      errorCount: 1,
    };
    const table = buildTable(result);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].kind).toBe("error");
    if (table.rows[0].kind === "error") {
      expect(table.rows[0].raw).toBe("{bad}");
      expect(table.rows[0].errorMessage).toBe("parse error");
    }
  });

  it("matches totalLines and errorCount from input ParseResult", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: '{"a":1}', data: { a: 1 } },
        { kind: "error", lineNumber: 2, raw: "{bad}", errorMessage: "err" },
      ],
      totalLines: 5,
      errorCount: 1,
    };
    const table = buildTable(result);
    expect(table.totalLines).toBe(5);
    expect(table.errorCount).toBe(1);
  });

  it("returns empty table for empty ParseResult", () => {
    const result: ParseResult = {
      lines: [],
      totalLines: 0,
      errorCount: 0,
    };
    const table = buildTable(result);
    expect(table.columns).toHaveLength(0);
    expect(table.rows).toHaveLength(0);
    expect(table.totalLines).toBe(0);
    expect(table.errorCount).toBe(0);
  });

  it("truncates long string display in CellValue", () => {
    const longStr = "x".repeat(200);
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: `{"text":"${longStr}"}`, data: { text: longStr } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      expect(row.cells["text"].display.length).toBeLessThanOrEqual(201);
    }
  });

  it("shows object preview with key-value pairs", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: '{"nested":{"x":1}}', data: { nested: { x: 1 } } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      expect(row.cells["nested"].display).toBe("{x: 1}");
    }
  });

  it("shows array preview with item values", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: '{"items":[1,2,3]}', data: { items: [1, 2, 3] } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      expect(row.cells["items"].display).toBe("[1, 2, 3]");
    }
  });

  it("truncates object preview after 3 keys", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: "{}", data: { wrapper: { a: 1, b: 2, c: 3, d: 4, e: 5 } } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      const display = row.cells["wrapper"].display;
      expect(display).toContain("a: 1");
      expect(display).toContain("…");
      expect(display).not.toContain("d:");
    }
  });

  it("truncates array preview after 3 items", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: "[]", data: { items: [10, 20, 30, 40, 50] } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      const display = row.cells["items"].display;
      expect(display).toBe("[10, 20, 30, …]");
    }
  });

  it("shows empty object as {}", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: "{}", data: { obj: {} } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      expect(row.cells["obj"].display).toBe("{}");
    }
  });

  it("shows empty array as []", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: "[]", data: { arr: [] } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      expect(row.cells["arr"].display).toBe("[]");
    }
  });

  it("shows nested objects within preview as {N}", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: "{}", data: { outer: { inner: { deep: 1 } } } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      expect(row.cells["outer"].display).toBe("{inner: {1}}");
    }
  });

  it("shows nested arrays within preview as [N]", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: "{}", data: { outer: { tags: [1, 2, 3] } } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      expect(row.cells["outer"].display).toBe("{tags: [3]}");
    }
  });

  it("preserves original value in CellValue.raw (not truncated)", () => {
    const longStr = "x".repeat(200);
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: `{"text":"${longStr}"}`, data: { text: longStr } },
      ],
      totalLines: 1,
      errorCount: 0,
    };
    const table = buildTable(result);
    const row = table.rows[0];
    if (row.kind === "ok") {
      expect(row.cells["text"].raw).toBe(longStr);
    }
  });

  it("creates __value column for non-object ok lines (primitives, arrays)", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 1, raw: "42", data: 42 },
        { kind: "ok", lineNumber: 2, raw: '"hello"', data: "hello" },
        { kind: "ok", lineNumber: 3, raw: "[1,2]", data: [1, 2] },
      ],
      totalLines: 3,
      errorCount: 0,
    };
    const table = buildTable(result);
    const keys = table.columns.map((c) => c.key);
    expect(keys).toContain("__value");
    const row0 = table.rows[0];
    if (row0.kind === "ok") {
      expect(row0.cells["__value"]).toBeDefined();
      expect(row0.cells["__value"].raw).toBe(42);
    }
  });

  it("preserves lineNumber on each ok row", () => {
    const result: ParseResult = {
      lines: [
        { kind: "ok", lineNumber: 7, raw: '{"a":1}', data: { a: 1 } },
      ],
      totalLines: 10,
      errorCount: 0,
    };
    const table = buildTable(result);
    expect(table.rows[0].lineNumber).toBe(7);
  });
});
