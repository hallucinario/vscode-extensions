import { describe, it, expect } from "vitest";
import { renderInlineDetailHtml } from "./inlineDetail.js";
import type { ParsedLine } from "../../../core/jsonl/types.js";

describe("renderInlineDetailHtml", () => {
  it("renders primitive properties as prop-row divs", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"name":"Alice","age":30}',
      data: { name: "Alice", age: 30 },
    };
    const html = renderInlineDetailHtml(line);
    expect(html).toContain('class="prop-key"');
    expect(html).toContain("name");
    expect(html).toContain("Alice");
    expect(html).toContain("30");
  });

  it("renders nested objects as collapsible details", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"user":{"id":1}}',
      data: { user: { id: 1 } },
    };
    const html = renderInlineDetailHtml(line);
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain("user");
    expect(html).toContain("obj-indicator");
  });

  it("renders arrays as collapsible details", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"tags":["a","b"]}',
      data: { tags: ["a", "b"] },
    };
    const html = renderInlineDetailHtml(line);
    expect(html).toContain("<details");
    expect(html).toContain("arr-indicator");
    expect(html).toContain("[2]");
  });

  it("renders error lines with error message and raw", () => {
    const line: ParsedLine = {
      kind: "error",
      lineNumber: 1,
      raw: "bad json",
      errorMessage: "Unexpected token",
    };
    const html = renderInlineDetailHtml(line);
    expect(html).toContain("Unexpected token");
    expect(html).toContain("bad json");
    expect(html).toContain("inline-detail-error");
  });

  it("renders empty object as {}", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"obj":{}}',
      data: { obj: {} },
    };
    const html = renderInlineDetailHtml(line);
    expect(html).toContain("{}");
    expect(html).not.toContain("<details");
  });

  it("renders null values", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"v":null}',
      data: { v: null },
    };
    const html = renderInlineDetailHtml(line);
    expect(html).toContain("json-null");
    expect(html).toContain("null");
  });

  it("renders boolean values", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"ok":true}',
      data: { ok: true },
    };
    const html = renderInlineDetailHtml(line);
    expect(html).toContain("json-boolean");
    expect(html).toContain("true");
  });

  it("escapes HTML in string values", () => {
    const line: ParsedLine = {
      kind: "ok",
      lineNumber: 1,
      raw: '{"xss":"<script>"}',
      data: { xss: "<script>" },
    };
    const html = renderInlineDetailHtml(line);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
