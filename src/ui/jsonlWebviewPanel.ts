import * as vscode from "vscode";
import type { App } from "../app.js";
import type { FromWebviewMessage, TableData } from "../core/jsonl/types.js";
import { parseJsonl } from "../core/jsonl/parser.js";
import { buildTable } from "../core/jsonl/tableBuilder.js";
import { searchRows } from "../core/jsonl/search.js";
import { randomBytes } from "node:crypto";

function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

export class JsonlWebviewPanel {
  private panel: vscode.WebviewPanel | undefined;
  private currentTableData: TableData | undefined;
  private readonly app: App;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(app: App) {
    this.app = app;
  }

  reveal(text?: string): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      if (text !== undefined) {
        this.update(text);
      }
      return;
    }

    const editor = vscode.window.activeTextEditor;
    const fileName = editor?.document.fileName.split("/").pop() ?? "untitled";

    this.panel = vscode.window.createWebviewPanel(
      "jsonlViewer.table",
      `JSONL: ${fileName}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.app.context.extensionUri, "dist"),
        ],
        retainContextWhenHidden: true,
      },
    );

    this.panel.webview.html = this.getHtml(this.panel.webview);

    this.panel.webview.onDidReceiveMessage(
      (msg: FromWebviewMessage) => this.handleMessage(msg),
      undefined,
      this.disposables,
    );

    this.panel.onDidChangeViewState(
      () => {
        if (this.panel?.visible && this.currentTableData) {
          this.panel.webview.postMessage({
            type: "update",
            data: this.currentTableData,
          });
        }
      },
      undefined,
      this.disposables,
    );

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        this.currentTableData = undefined;
        for (const d of this.disposables) {
          d.dispose();
        }
        this.disposables.length = 0;
      },
      undefined,
    );

    if (text !== undefined) {
      this.update(text);
    }
  }

  update(text: string): void {
    const parsed = parseJsonl(text);
    this.currentTableData = buildTable(parsed);
    if (this.panel) {
      this.panel.webview.postMessage({
        type: "update",
        data: this.currentTableData,
      });
    }
  }

  get isVisible(): boolean {
    return this.panel?.visible ?? false;
  }

  dispose(): void {
    this.panel?.dispose();
  }

  private handleMessage(msg: FromWebviewMessage): void {
    switch (msg.type) {
      case "ready":
        if (this.currentTableData && this.panel) {
          this.panel.webview.postMessage({
            type: "update",
            data: this.currentTableData,
          });
        }
        break;

      case "copyValue":
        vscode.env.clipboard.writeText(msg.value);
        vscode.window.showInformationMessage("Value copied");
        break;

      case "copyRow": {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const line = editor.document.lineAt(msg.lineNumber - 1);
          vscode.env.clipboard.writeText(line.text);
          vscode.window.showInformationMessage("Line copied");
        }
        break;
      }

      case "goToLine": {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const pos = new vscode.Position(msg.lineNumber - 1, 0);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(
            new vscode.Range(pos, pos),
            vscode.TextEditorRevealType.InCenter,
          );
        }
        break;
      }

      case "search": {
        if (this.currentTableData && this.panel) {
          const result = searchRows(
            this.currentTableData.rows,
            msg.query,
          );
          this.panel.webview.postMessage({
            type: "searchResult",
            data: result,
          });
        }
        break;
      }
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = generateNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.app.context.extensionUri, "dist", "webview.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.app.context.extensionUri,
        "dist",
        "webview.css",
      ),
    );

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource};" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>JSONL Table</title>
</head>
<body>
  <div id="app">
    <div id="toolbar">
      <input id="search-input" type="text" placeholder="Search..." />
      <span id="status"></span>
    </div>
    <div id="main-area">
      <div id="table-container">
        <table id="data-table">
          <thead><tr id="header-row"></tr></thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
      <div id="detail-panel" class="hidden">
        <div id="detail-header">
          <span id="detail-title">Detail</span>
          <button id="detail-close" title="Close">&times;</button>
        </div>
        <pre id="detail-content"></pre>
      </div>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
