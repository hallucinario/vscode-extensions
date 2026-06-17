import * as vscode from "vscode";

export type Logger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown): void;
  show(): void;
  dispose(): void;
};

export function createLogger(name: string): Logger {
  const channel = vscode.window.createOutputChannel(name);

  function formatMeta(meta: Record<string, unknown>): string {
    return Object.entries(meta)
      .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
      .join("\n");
  }

  function timestamp(): string {
    return new Date().toISOString();
  }

  return {
    info(message: string, meta?: Record<string, unknown>): void {
      channel.appendLine(`[INFO] ${timestamp()} ${message}`);
      if (meta) channel.appendLine(formatMeta(meta));
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      channel.appendLine(`[WARN] ${timestamp()} ${message}`);
      if (meta) channel.appendLine(formatMeta(meta));
    },
    error(message: string, error?: unknown): void {
      channel.appendLine(`[ERROR] ${timestamp()} ${message}`);
      if (error instanceof Error) {
        channel.appendLine(`  ${error.message}`);
        if (error.stack) channel.appendLine(`  ${error.stack}`);
      } else if (error !== undefined) {
        channel.appendLine(`  ${String(error)}`);
      }
    },
    show(): void {
      channel.show(true);
    },
    dispose(): void {
      channel.dispose();
    },
  };
}
