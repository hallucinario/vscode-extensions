import * as vscode from "vscode";
import type { App } from "../app.js";
import type { TreeNode } from "../core/jsonl/types.js";
import { parseJsonl } from "../core/jsonl/parser.js";
import { buildTree } from "../core/jsonl/treeBuilder.js";

export function isJsonlDocument(doc: vscode.TextDocument): boolean {
  if (doc.languageId === "jsonl") return true;
  const name = doc.fileName.toLowerCase();
  return name.endsWith(".jsonl") || name.endsWith(".ndjson");
}

function mapTreeNodeToItem(node: TreeNode): vscode.TreeItem {
  const state = node.collapsible
    ? vscode.TreeItemCollapsibleState.Collapsed
    : vscode.TreeItemCollapsibleState.None;

  const item = new vscode.TreeItem(node.label, state);

  if (node.description !== undefined) {
    item.description = node.description;
  }
  if (node.tooltip !== undefined) {
    item.tooltip = node.tooltip;
  }

  item.contextValue = node.contextValue;

  // Icons
  switch (node.contextValue) {
    case "entry":
      item.iconPath = new vscode.ThemeIcon("json");
      break;
    case "error":
      item.iconPath = new vscode.ThemeIcon(
        "error",
        new vscode.ThemeColor("errorForeground"),
      );
      break;
    case "property":
      item.iconPath = new vscode.ThemeIcon("symbol-field");
      break;
    case "arrayItem":
      item.iconPath = new vscode.ThemeIcon("symbol-array");
      break;
  }

  // Click-to-navigate for entry and error nodes
  if (
    (node.contextValue === "entry" || node.contextValue === "error") &&
    node.lineNumber !== undefined
  ) {
    item.command = {
      command: "jsonlViewer.goToLine",
      title: "Go to Line",
      arguments: [node.lineNumber],
    };
  }

  return item;
}

type TreeElement = {
  readonly node: TreeNode;
};

export class JsonlTreeProvider
  implements vscode.TreeDataProvider<TreeElement>
{
  private readonly _onDidChangeTreeData =
    new vscode.EventEmitter<TreeElement | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private roots: readonly TreeNode[] = [];
  private readonly app: App;

  constructor(app: App) {
    this.app = app;
  }

  refresh(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor && isJsonlDocument(editor.document)) {
      const text = editor.document.getText();
      const parsed = parseJsonl(text);
      this.roots = buildTree(parsed.lines);
    } else {
      this.roots = [];
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeElement): vscode.TreeItem {
    return mapTreeNodeToItem(element.node);
  }

  getChildren(element?: TreeElement): TreeElement[] {
    if (!element) {
      // Root level
      if (this.roots.length === 0) {
        const editor = vscode.window.activeTextEditor;
        if (editor && isJsonlDocument(editor.document)) {
          const text = editor.document.getText();
          const parsed = parseJsonl(text);
          this.roots = buildTree(parsed.lines);
        }
      }
      return this.roots.map((node) => ({ node }));
    }
    return element.node.children.map((node) => ({ node }));
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
