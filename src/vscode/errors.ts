import type { Logger } from "./logger.js";
import * as vscode from "vscode";

export type AppError =
  | { readonly kind: "NoActiveEditor"; readonly message: string }
  | { readonly kind: "NotJsonlFile"; readonly message: string }
  | { readonly kind: "Unexpected"; readonly message: string; readonly cause?: unknown };

export function noActiveEditor(): AppError {
  return { kind: "NoActiveEditor", message: "No active editor" };
}

export function notJsonlFile(): AppError {
  return { kind: "NotJsonlFile", message: "Active file is not a JSONL file" };
}

export function unexpected(message: string, cause?: unknown): AppError {
  return { kind: "Unexpected", message, cause };
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "message" in value
  );
}

export function showAppError(error: AppError, logger: Logger): void {
  logger.error(`[${error.kind}] ${error.message}`, "cause" in error ? error.cause : undefined);
  switch (error.kind) {
    case "NoActiveEditor":
      vscode.window.showWarningMessage("No active editor. Open a JSONL file first.");
      break;
    case "NotJsonlFile":
      vscode.window.showWarningMessage("Active file is not a JSONL file (.jsonl or .ndjson).");
      break;
    case "Unexpected":
      vscode.window.showErrorMessage(`Unexpected error: ${error.message}. See Output for details.`);
      break;
  }
}
