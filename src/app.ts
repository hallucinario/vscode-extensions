import type * as vscode from "vscode";
import { createLogger, type Logger } from "./vscode/logger.js";
import { getConfig, type JsonlViewerConfig } from "./vscode/config.js";

export type App = {
  readonly context: vscode.ExtensionContext;
  readonly logger: Logger;
  readonly config: () => JsonlViewerConfig;
};

export function createApp(context: vscode.ExtensionContext): App {
  const logger = createLogger("JSONL Viewer");
  context.subscriptions.push({ dispose: () => logger.dispose() });

  return {
    context,
    logger,
    config: getConfig,
  };
}
