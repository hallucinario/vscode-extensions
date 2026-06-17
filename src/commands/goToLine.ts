import * as vscode from "vscode";

export function executeGoToLine(lineNumber: number): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const pos = new vscode.Position(lineNumber - 1, 0);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(
    new vscode.Range(pos, pos),
    vscode.TextEditorRevealType.InCenter,
  );
}
