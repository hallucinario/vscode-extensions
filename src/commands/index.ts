import * as vscode from "vscode";
import type { App } from "../app.js";
import { JsonlTreeProvider, isJsonlDocument } from "../ui/jsonlTreeProvider.js";
import { JsonlWebviewPanel } from "../ui/jsonlWebviewPanel.js";
import { executeRefresh } from "./refresh.js";
import { executeOpenTable } from "./openTable.js";
import { executeCopyValue } from "./copyValue.js";
import { executeCopyLine } from "./copyLine.js";
import { executeGoToLine } from "./goToLine.js";
import { onConfigChange } from "../vscode/config.js";

export function registerCommands(app: App): void {
  const treeProvider = new JsonlTreeProvider(app);
  const webviewPanel = new JsonlWebviewPanel(app);

  // Register TreeView
  const treeView = vscode.window.createTreeView("jsonlViewer.entries", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // Register commands
  const refreshCmd = vscode.commands.registerCommand(
    "jsonlViewer.refresh",
    () => executeRefresh(app, treeProvider, webviewPanel),
  );

  const openTableCmd = vscode.commands.registerCommand(
    "jsonlViewer.openTable",
    () => executeOpenTable(app, webviewPanel),
  );

  const copyValueCmd = vscode.commands.registerCommand(
    "jsonlViewer.copyValue",
    (element?: { node?: { value?: string } }) => {
      if (element?.node) {
        executeCopyValue(element.node as Parameters<typeof executeCopyValue>[0]);
      }
    },
  );

  const copyLineCmd = vscode.commands.registerCommand(
    "jsonlViewer.copyLine",
    (element?: { node?: { value?: string } }) => {
      if (element?.node) {
        executeCopyLine(element.node as Parameters<typeof executeCopyLine>[0]);
      }
    },
  );

  const goToLineCmd = vscode.commands.registerCommand(
    "jsonlViewer.goToLine",
    (lineNumber?: number) => {
      if (typeof lineNumber === "number") {
        executeGoToLine(lineNumber);
      }
    },
  );

  // Debounce utility
  function debounce(fn: () => void, delay: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  const debouncedRefresh = debounce(() => {
    executeRefresh(app, treeProvider, webviewPanel);
  }, 300);

  const debouncedDocRefresh = debounce(() => {
    executeRefresh(app, treeProvider, webviewPanel);
  }, 500);

  // Auto-refresh on active editor change
  const editorChange = vscode.window.onDidChangeActiveTextEditor(() => {
    debouncedRefresh();
  });

  // Auto-refresh on document content change
  const docChange = vscode.workspace.onDidChangeTextDocument((e) => {
    const editor = vscode.window.activeTextEditor;
    if (editor && e.document === editor.document && isJsonlDocument(e.document)) {
      debouncedDocRefresh();
    }
  });

  // Auto-refresh on config change
  const configChange = onConfigChange(() => {
    executeRefresh(app, treeProvider, webviewPanel);
  });

  // Push all disposables
  app.context.subscriptions.push(
    treeView,
    treeProvider,
    refreshCmd,
    openTableCmd,
    copyValueCmd,
    copyLineCmd,
    goToLineCmd,
    editorChange,
    docChange,
    configChange,
    { dispose: () => webviewPanel.dispose() },
  );

  // Initial refresh
  treeProvider.refresh();
}
