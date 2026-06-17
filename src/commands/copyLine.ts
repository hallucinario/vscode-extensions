import * as vscode from "vscode";
import type { TreeNode } from "../core/jsonl/types.js";

export function executeCopyLine(node: TreeNode): void {
  if (node.value !== undefined) {
    vscode.env.clipboard.writeText(node.value);
    vscode.window.showInformationMessage("Line copied");
  }
}
