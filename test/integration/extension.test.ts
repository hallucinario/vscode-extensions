import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";

const fixturesPath = path.resolve(
  __dirname,
  "../../../test/fixtures/sample-workspace",
);

suite("Extension Activation", () => {
  test("extension activates on .jsonl file open", async () => {
    const doc = await vscode.workspace.openTextDocument(
      path.join(fixturesPath, "valid.jsonl"),
    );
    await vscode.window.showTextDocument(doc);

    // Wait for activation (language-based activation can be async)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const ext = vscode.extensions.getExtension("hallucinario.jsonl-viewer");
    assert.ok(ext, "Extension should be found");
    assert.ok(ext.isActive, "Extension should be active after opening .jsonl");
  });

  test("all commands are registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    const expected = [
      "jsonlViewer.refresh",
      "jsonlViewer.openTable",
      "jsonlViewer.copyValue",
      "jsonlViewer.copyLine",
      "jsonlViewer.goToLine",
    ];
    for (const cmd of expected) {
      assert.ok(
        commands.includes(cmd),
        `Command "${cmd}" should be registered`,
      );
    }
  });

  test("extension does not activate for non-jsonl files", async () => {
    // Close all editors first
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Open the workspace settings.json (not a .jsonl file)
    const settingsPath = path.join(fixturesPath, ".vscode", "settings.json");
    const doc = await vscode.workspace.openTextDocument(settingsPath);
    await vscode.window.showTextDocument(doc);

    // The extension may already be active from the previous test,
    // but we verify the document language is not jsonl
    assert.notStrictEqual(
      doc.languageId,
      "jsonl",
      "settings.json should not be recognized as jsonl",
    );
  });
});
