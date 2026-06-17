import * as vscode from "vscode";
import type { TreeNode } from "../core/jsonl/types.js";

export function executeCopyValue(node: TreeNode): void {
  if (node.value !== undefined) {
    vscode.env.clipboard.writeText(node.value);
    vscode.window.showInformationMessage("Value copied");
  }
}
