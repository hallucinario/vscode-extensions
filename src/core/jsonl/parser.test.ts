import { describe, it, expect } from "vitest";
import { parseJsonl } from "./parser.js";

describe("parseJsonl", () => {
  it("parses a single valid JSON object line", () => {
    const result = parseJsonl('{"id":1,"name":"Alice"}');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("ok");
    expect(result.lines[0].kind === "ok" && result.lines[0].data).toEqual({ id: 1, name: "Alice" });
    expect(result.errorCount).toBe(0);
  });

  it("parses multi-line JSONL with correct line count", () => {
    const content = '{"a":1}\n{"b":2}\n{"c":3}';
    const result = parseJsonl(content);
    expect(result.lines).toHaveLength(3);
    expect(result.lines.every((l) => l.kind === "ok")).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it("skips blank lines and does not include them in lines array", () => {
    const content = '{"a":1}\n\n{"b":2}';
    const result = parseJsonl(content);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].kind === "ok" && result.lines[0].data).toEqual({ a: 1 });
    expect(result.lines[1].kind === "ok" && result.lines[1].data).toEqual({ b: 2 });
  });

  it("reports malformed JSON as error with non-empty errorMessage", () => {
    const result = parseJsonl("{not valid json}");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("error");
    if (result.lines[0].kind === "error") {
      expect(result.lines[0].errorMessage).toBeTruthy();
    }
    expect(result.errorCount).toBe(1);
  });

  it("handles mixed valid and invalid lines at correct lineNumbers", () => {
    const content = '{"ok":true}\n{bad}\n{"also":"ok"}';
    const result = parseJsonl(content);
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0].kind).toBe("ok");
    expect(result.lines[0].lineNumber).toBe(1);
    expect(result.lines[1].kind).toBe("error");
    expect(result.lines[1].lineNumber).toBe(2);
    expect(result.lines[2].kind).toBe("ok");
    expect(result.lines[2].lineNumber).toBe(3);
    expect(result.errorCount).toBe(1);
  });

  it("returns correct result for empty string", () => {
    const result = parseJsonl("");
    // "".split("\n") gives [""], which is a single blank line -> skipped
    expect(result.lines).toHaveLength(0);
    expect(result.totalLines).toBe(1);
    expect(result.errorCount).toBe(0);
  });

  it("handles trailing newline without phantom error entry", () => {
    const content = '{"a":1}\n';
    const result = parseJsonl(content);
    // trailing newline creates a blank second line which should be skipped
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("ok");
    expect(result.errorCount).toBe(0);
  });

  it("parses non-object JSON: string", () => {
    const result = parseJsonl('"hello"');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("ok");
    expect(result.lines[0].kind === "ok" && result.lines[0].data).toBe("hello");
  });

  it("parses non-object JSON: number", () => {
    const result = parseJsonl("42");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("ok");
    expect(result.lines[0].kind === "ok" && result.lines[0].data).toBe(42);
  });

  it("parses non-object JSON: array", () => {
    const result = parseJsonl("[1,2,3]");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("ok");
    expect(result.lines[0].kind === "ok" && result.lines[0].data).toEqual([1, 2, 3]);
  });

  it("parses non-object JSON: boolean true", () => {
    const result = parseJsonl("true");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("ok");
    expect(result.lines[0].kind === "ok" && result.lines[0].data).toBe(true);
  });

  it("parses non-object JSON: null", () => {
    const result = parseJsonl("null");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("ok");
    expect(result.lines[0].kind === "ok" && result.lines[0].data).toBe(null);
  });

  it("preserves Unicode content correctly", () => {
    const result = parseJsonl('{"name":"太郎","city":"東京"}');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("ok");
    if (result.lines[0].kind === "ok") {
      const data = result.lines[0].data as Record<string, unknown>;
      expect(data["name"]).toBe("太郎");
      expect(data["city"]).toBe("東京");
    }
  });

  it("parses deeply nested JSON object", () => {
    const result = parseJsonl('{"a":{"b":{"c":{"d":1}}}}');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe("ok");
    if (result.lines[0].kind === "ok") {
      const data = result.lines[0].data as Record<string, unknown>;
      expect(data).toEqual({ a: { b: { c: { d: 1 } } } });
    }
  });

  it("computes errorCount accurately", () => {
    const content = '{"ok":1}\n{bad1}\n{"ok":2}\n{bad2}\n{bad3}';
    const result = parseJsonl(content);
    expect(result.errorCount).toBe(3);
  });

  it("computes totalLines counting all raw lines including blanks", () => {
    const content = '{"a":1}\n\n{"b":2}\n\n';
    const result = parseJsonl(content);
    // 5 raw lines: '{"a":1}', '', '{"b":2}', '', ''
    expect(result.totalLines).toBe(5);
  });

  it("preserves raw text on each parsed line", () => {
    const raw = '{"id": 1}';
    const result = parseJsonl(raw);
    expect(result.lines[0].raw).toBe(raw);
  });
});
