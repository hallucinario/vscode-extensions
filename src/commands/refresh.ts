import * as vscode from "vscode";
import type { App } from "../app.js";
import type { JsonlTreeProvider } from "../ui/jsonlTreeProvider.js";
import type { JsonlWebviewPanel } from "../ui/jsonlWebviewPanel.js";
import { isJsonlDocument } from "../ui/jsonlTreeProvider.js";

export function executeRefresh(
  _app: App,
  treeProvider: JsonlTreeProvider,
  webviewPanel: JsonlWebviewPanel,
): void {
  treeProvider.refresh();

  const editor = vscode.window.activeTextEditor;
  if (editor && isJsonlDocument(editor.document) && webviewPanel.isVisible) {
    webviewPanel.update(editor.document.getText());
  }
}
