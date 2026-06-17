import type { JsonValue, ParsedLine, TreeNode } from "./types.js";
import { summarizeLine } from "./summarize.js";

function buildChildren(data: JsonValue): readonly TreeNode[] {
  if (data === null || typeof data !== "object") return [];

  if (Array.isArray(data)) {
    return data.map((item, i): TreeNode => {
      const children = buildChildren(item);
      return {
        label: `[${i}]`,
        contextValue: "arrayItem",
        value: JSON.stringify(item),
        children,
        collapsible: children.length > 0,
      };
    });
  }

  // Plain object
  return Object.entries(data).map(([key, val]): TreeNode => {
    const children = buildChildren(val);
    return {
      label: key,
      contextValue: "property",
      value: JSON.stringify(val),
      children,
      collapsible: children.length > 0,
    };
  });
}

export function buildTreeFromLine(line: ParsedLine): TreeNode {
  if (line.kind === "error") {
    return {
      label: `Line ${line.lineNumber}`,
      contextValue: "error",
      value: line.raw,
      lineNumber: line.lineNumber,
      description: line.errorMessage || "Parse Error",
      tooltip: `${line.errorMessage}\n${line.raw}`,
      children: [],
      collapsible: false,
    };
  }

  const children = buildChildren(line.data);
  return {
    label: `Line ${line.lineNumber}`,
    contextValue: "entry",
    value: line.raw,
    lineNumber: line.lineNumber,
    description: summarizeLine(line.data),
    children,
    collapsible: children.length > 0,
  };
}

export function buildTree(lines: readonly ParsedLine[]): readonly TreeNode[] {
  return lines.map(buildTreeFromLine);
}
