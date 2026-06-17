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

/** Ensure the extension is activated before running webview tests. */
async function ensureActivated(): Promise<void> {
  const ext = vscode.extensions.getExtension("hallucinario.jsonl-viewer");
  if (ext && !ext.isActive) {
    await ext.activate();
  }
}

suite("Webview Panel", () => {
  suiteSetup(async () => {
    await ensureActivated();
  });

  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  test("openTable command creates a webview panel", async () => {
    await openFixture("valid.jsonl");

    // Count tab groups before opening table
    const tabsBefore = vscode.window.tabGroups.all.flatMap((g) => g.tabs);

    await vscode.commands.executeCommand("jsonlViewer.openTable");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // A new tab (webview) should have been created
    const tabsAfter = vscode.window.tabGroups.all.flatMap((g) => g.tabs);
    assert.ok(
      tabsAfter.length > tabsBefore.length,
      `A new tab should be created (before: ${tabsBefore.length}, after: ${tabsAfter.length})`,
    );
  });

  test("webview panel title contains filename", async () => {
    await openFixture("valid.jsonl");

    await vscode.commands.executeCommand("jsonlViewer.openTable");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Find a tab whose label contains "JSONL" (the panel title format is "JSONL: <filename>")
    const allTabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs);
    const jsonlTab = allTabs.find((tab) => tab.label.includes("JSONL"));
    assert.ok(jsonlTab, "A tab with 'JSONL' in its label should exist");
    assert.ok(
      jsonlTab.label.includes("valid.jsonl"),
      `Tab label should contain the filename, got: "${jsonlTab.label}"`,
    );
  });

  test("openTable for different fixture files", async () => {
    // Close everything first
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Open nested.jsonl and create a table
    await openFixture("nested.jsonl");
    await vscode.commands.executeCommand("jsonlViewer.openTable");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const allTabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs);
    const jsonlTab = allTabs.find((tab) => tab.label.includes("JSONL"));
    assert.ok(jsonlTab, "A tab with 'JSONL' in its label should exist");
    assert.ok(
      jsonlTab.label.includes("nested.jsonl"),
      `Tab label should contain 'nested.jsonl', got: "${jsonlTab.label}"`,
    );
  });

  test("panel disposes cleanly and can be recreated", async () => {
    await openFixture("valid.jsonl");

    // Create the first panel
    await vscode.commands.executeCommand("jsonlViewer.openTable");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Close all editors (which disposes the webview panel)
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Reopen the file and recreate the panel
    await openFixture("valid.jsonl");
    await vscode.commands.executeCommand("jsonlViewer.openTable");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const allTabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs);
    const jsonlTab = allTabs.find((tab) => tab.label.includes("JSONL"));
    assert.ok(
      jsonlTab,
      "Webview panel should be recreated after disposal",
    );
  });

  test("refresh command works without error when panel is open", async () => {
    await openFixture("valid.jsonl");

    await vscode.commands.executeCommand("jsonlViewer.openTable");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Refresh should work without throwing when both tree and webview are active
    await vscode.commands.executeCommand("jsonlViewer.refresh");
    assert.ok(true, "refresh command did not throw with webview open");
  });

  test("refresh command works without error when no panel is open", async () => {
    await openFixture("valid.jsonl");

    // Refresh without opening the table view
    await vscode.commands.executeCommand("jsonlViewer.refresh");
    assert.ok(true, "refresh command did not throw without webview panel");
  });

  test("openTable on malformed.jsonl does not throw", async () => {
    await openFixture("malformed.jsonl");

    // Opening table view on a file with parse errors should not crash
    await vscode.commands.executeCommand("jsonlViewer.openTable");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const allTabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs);
    const jsonlTab = allTabs.find((tab) => tab.label.includes("JSONL"));
    assert.ok(jsonlTab, "Webview panel should be created even for malformed files");
  });
});
