import * as vscode from "vscode";
import type { App } from "../app.js";
import type { FromWebviewMessage, TableData } from "../core/jsonl/types.js";
import { parseJsonl } from "../core/jsonl/parser.js";
import { buildTable } from "../core/jsonl/tableBuilder.js";
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
    const table = buildTable(parsed);
    const maxLines = this.app.config().maxDisplayedLines;
    const rows = table.rows.slice(0, maxLines);
    this.currentTableData = { ...table, rows };

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
        vscode.window.showInformationMessage("Copied");
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
    content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>JSONL Table</title>
</head>
<body>
  <div id="app">
    <div id="toolbar">
      <div class="search-wrapper">
        <input id="search-input" type="text" placeholder="Search..." aria-label="Search rows" />
        <button id="search-clear" class="icon-btn" title="Clear search" aria-label="Clear search">&times;</button>
        <span id="search-count"></span>
      </div>
      <span id="status" role="status" aria-live="polite"></span>
    </div>
    <div id="grid-area">
      <div id="grid" role="grid" aria-label="JSONL data table" tabindex="0">
        <div id="header-row" class="header-row"></div>
        <div id="scroll-container"></div>
      </div>
    </div>
    <div id="resize-handle" class="horizontal-resize"></div>
    <div id="detail-panel" class="hidden" role="complementary" aria-label="Row detail" aria-hidden="true">
      <div id="detail-header">
        <span id="detail-title">Detail</span>
        <div class="detail-actions">
          <button id="detail-copy" class="icon-btn" title="Copy JSON" aria-label="Copy JSON">Copy</button>
          <button id="detail-close" class="icon-btn" title="Close" aria-label="Close detail">&times;</button>
        </div>
      </div>
      <div id="detail-content" tabindex="0"></div>
    </div>
    <div id="empty-state" class="empty-state hidden">
      <div class="empty-state-content">
        <div class="empty-icon">&#128196;</div>
        <h2>No data to display</h2>
        <p>Open a JSONL file and click "Open Table View"</p>
      </div>
    </div>
    <div id="loading-state" class="loading-state hidden">
      <div class="progress-bar"><div class="progress-bar-fill"></div></div>
      <p id="loading-text"></p>
    </div>
    <div id="copied-tooltip" class="copied-tooltip hidden">Copied</div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
