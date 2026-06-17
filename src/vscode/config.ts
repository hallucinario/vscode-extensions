import * as vscode from "vscode";

export type JsonlViewerConfig = {
  maxDisplayedLines: number;
  previewKeyCount: number;
};

export function getConfig(): JsonlViewerConfig {
  const config = vscode.workspace.getConfiguration("jsonlViewer");
  return {
    maxDisplayedLines: config.get<number>("maxDisplayedLines", 5000),
    previewKeyCount: config.get<number>("previewKeyCount", 3),
  };
}

export function onConfigChange(callback: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("jsonlViewer")) {
      callback();
    }
  });
}
