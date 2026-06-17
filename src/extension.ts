import * as vscode from "vscode";
import { createApp } from "./app.js";
import { registerCommands } from "./commands/index.js";

export function activate(context: vscode.ExtensionContext): void {
  const app = createApp(context);
  app.logger.info("JSONL Viewer activating");

  registerCommands(app);

  app.logger.info("JSONL Viewer activated");
}

export function deactivate(): void {
  // Cleanup handled by disposables in context.subscriptions
}
