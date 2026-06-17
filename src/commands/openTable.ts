import * as vscode from "vscode";
import type { App } from "../app.js";
import type { JsonlWebviewPanel } from "../ui/jsonlWebviewPanel.js";
import { isJsonlDocument } from "../ui/jsonlTreeProvider.js";
import { showAppError, noActiveEditor, notJsonlFile } from "../vscode/errors.js";

export function executeOpenTable(
  app: App,
  webviewPanel: JsonlWebviewPanel,
): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    showAppError(noActiveEditor(), app.logger);
    return;
  }
  if (!isJsonlDocument(editor.document)) {
    showAppError(notJsonlFile(), app.logger);
    return;
  }
  webviewPanel.reveal(editor.document.getText());
}
