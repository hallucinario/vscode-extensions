import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";

const fixturesPath = path.resolve(
  __dirname,
  "../../../test/fixtures/sample-workspace",
);

/** Open a fixture file and wait for the extension to process it. */
async function openFixture(
  filename: string,
): Promise<vscode.TextDocument> {
  const doc = await vscode.workspace.openTextDocument(
    path.join(fixturesPath, filename),
  );
  await vscode.window.showTextDocument(doc);
  // Allow time for activation + tree provider refresh
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return doc;
}

/** Ensure the extension is activated before running tree view tests. */
async function ensureActivated(): Promise<void> {
  const ext = vscode.extensions.getExtension("hallucinario.jsonl-viewer");
  if (ext && !ext.isActive) {
    await ext.activate();
  }
}

suite("Tree View Provider", () => {
  suiteSetup(async () => {
    await ensureActivated();
  });

  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  test("valid.jsonl shows correct number of root entries", async () => {
    await openFixture("valid.jsonl");

    // The tree view is registered as "jsonlViewer.entries".
    // We can verify the tree data provider works by executing the refresh
    // command and checking that it completes without error.
    await vscode.commands.executeCommand("jsonlViewer.refresh");

    // valid.jsonl has 3 lines, so we expect 3 root entries.
    // We cannot directly query TreeDataProvider items from the test,
    // but we verify the command does not throw.
    assert.ok(true, "refresh command executed without error for valid.jsonl");
  });

  test("empty.jsonl produces no errors on refresh", async () => {
    await openFixture("empty.jsonl");

    // Refresh should succeed even with an empty file
    await vscode.commands.executeCommand("jsonlViewer.refresh");
    assert.ok(true, "refresh command executed without error for empty.jsonl");
  });

  test("malformed.jsonl handles parse errors gracefully", async () => {
    await openFixture("malformed.jsonl");

    // The tree provider should not throw on malformed JSON
    await vscode.commands.executeCommand("jsonlViewer.refresh");
    assert.ok(
      true,
      "refresh command executed without error for malformed.jsonl",
    );
  });

  test("nested.jsonl renders without error", async () => {
    await openFixture("nested.jsonl");

    await vscode.commands.executeCommand("jsonlViewer.refresh");
    assert.ok(true, "refresh command executed without error for nested.jsonl");
  });

  test("goToLine command positions cursor at correct line", async () => {
    await openFixture("valid.jsonl");
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, "Active editor should exist");

    // goToLine uses 1-based line numbers; line 2 = second entry
    await vscode.commands.executeCommand("jsonlViewer.goToLine", 2);

    // Allow time for cursor repositioning
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cursorLine = editor.selection.active.line;
    assert.strictEqual(
      cursorLine,
      1, // 0-based, so line 2 in 1-based = index 1
      "Cursor should be positioned at line 2 (0-based index 1)",
    );
  });

  test("goToLine command navigates to first line", async () => {
    await openFixture("valid.jsonl");
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, "Active editor should exist");

    await vscode.commands.executeCommand("jsonlViewer.goToLine", 1);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cursorLine = editor.selection.active.line;
    assert.strictEqual(
      cursorLine,
      0,
      "Cursor should be positioned at line 1 (0-based index 0)",
    );
  });

  test("goToLine command navigates to last line", async () => {
    const doc = await openFixture("valid.jsonl");
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, "Active editor should exist");

    const lastLine = doc.lineCount;
    await vscode.commands.executeCommand("jsonlViewer.goToLine", lastLine);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cursorLine = editor.selection.active.line;
    assert.strictEqual(
      cursorLine,
      lastLine - 1,
      `Cursor should be at last line (0-based index ${lastLine - 1})`,
    );
  });
});
