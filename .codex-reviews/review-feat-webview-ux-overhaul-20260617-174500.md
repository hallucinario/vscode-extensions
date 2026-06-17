# Code Review: feat/webview-ux-overhaul → main

**Date**: 2026-06-17 17:45
**Reviewer**: Claude (Anthropic, multi-agent exploration + synthesis)
**Diff scope**: 24 files changed, +1955/-392 lines

## Executive Summary

A well-engineered webview rewrite with strong architectural fundamentals — reactive state store, virtual scrolling, modular rendering, comprehensive unit tests (71 new). Two performance issues in `renderVisibleRows()` (repeated full search + O(n) indexOf per row on every scroll) need fixing before merge. Architecture and test quality are excellent.

## Statistics

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| WARNING  | 3 |
| SUGGESTION | 2 |
| PRAISE   | 4 |

## Critical Issues

### [CRITICAL] Search recomputed on every scroll event
- **File**: `src/ui/webview/main.ts:120`
- **Issue**: `renderVisibleRows()` calls `searchRows(state.data?.rows ?? [], state.searchQuery)` on every scroll event. For 5000 rows this is a full regex scan per scroll frame, causing potential jank during fast scrolling.
- **Impact**: Scroll performance degrades linearly with dataset size. At 5000 rows with a search active, every scroll frame runs 5000 regex tests.
- **Suggestion**: Cache the search result in the store or a local variable when search query changes, not on every render. Move the search computation into `recomputeDisplayedRows()` and store the `matchMap` alongside `displayedRows`.

## Warnings

### [WARNING] O(n) indexOf per rendered row
- **File**: `src/ui/webview/main.ts:124`
- **Issue**: `state.data?.rows.indexOf(row)` is called for every visible row on every scroll. With overscan=10 and ~10 visible rows, that's ~30 × O(5000) = 150,000 comparisons per scroll event.
- **Suggestion**: Pre-build a `Map<TableRow, number>` mapping row references to their original indices when data arrives. Look up in O(1) during render.

### [WARNING] Type duplication across core/webview boundary
- **File**: `src/ui/webview/types.ts` vs `src/core/jsonl/types.ts`
- **Issue**: `ColumnDef`, `CellValue`, `TableRow`, `TableData`, `SearchResult` are defined identically in both files. If core types change, webview types must be manually synchronized.
- **Suggestion**: Have webview types.ts re-export from core types, or move the shared types to a dedicated shared location. The esbuild dual-entry setup supports this since both bundles can import from a common source.

### [WARNING] Unused `searchResult` message handler
- **File**: `src/ui/webview/main.ts:401-402`
- **Issue**: `case "searchResult": break;` — empty handler for a message the extension never sends (search was moved client-side). Dead code from incomplete refactoring.
- **Suggestion**: Remove the `searchResult` case from the handler and the `SearchResult` type from `ToWebviewMessage` if server-side search is fully abandoned.

## Suggestions

### [SUGGESTION] Persisted scroll restoration races with data load
- **File**: `src/ui/webview/main.ts:388-391`
- **Issue**: `persisted?.scrollTop` is checked in the `update` message handler, but `persisted` is `const` captured at init. After the first data update restores scroll, subsequent updates (from editor changes) will keep trying to restore the same scroll position.
- **Suggestion**: Clear the persisted reference after first use: `const initialScrollTop = persisted?.scrollTop; /* use once, then discard */`

### [SUGGESTION] Store `setData` reset doesn't auto-recompute
- **File**: `src/ui/webview/state/store.ts:53-61`
- **Issue**: `setData` resets search/sort state but sets `displayedRows` to raw data rows. Callers must remember to call `recomputeDisplayedRows()` after every `setData`. This coupling is implicit.
- **Suggestion**: Either document this contract clearly, or have the store accept a `recompute` callback that runs automatically after `setData`.

## Positive Patterns

### [PRAISE] Modular architecture
- **Files**: `src/ui/webview/core/`, `src/ui/webview/state/`, `src/ui/webview/render/`
- **What's good**: Clean separation of pure logic (testable) from DOM rendering. The `core/` modules have zero DOM dependencies and are fully unit-testable. The `render/` modules encapsulate DOM creation.

### [PRAISE] Comprehensive TDD test coverage
- **Files**: `*.test.ts` (6 new test files, 71 tests)
- **What's good**: Every core module has thorough tests — state store (14 tests), virtual scroll (8 tests), search (9 tests), sort (10 tests), keyboard nav (13 tests), persistence (9 tests). Edge cases (empty data, boundary indices, error rows) are well-covered.

### [PRAISE] Virtual scroll implementation
- **File**: `src/ui/webview/core/virtualScroll.ts`
- **What's good**: Simple, correct, and testable. The sentinel + absolute positioning approach is a well-proven pattern. The `computeVisibleRange` function is pure and its correctness is easy to verify from tests.

### [PRAISE] Accessibility-first design
- **Files**: `src/ui/webview/render/header.ts`, `row.ts`, `styles.css`, HTML template
- **What's good**: ARIA grid roles, `aria-sort`, `aria-rowindex`, `aria-selected`, focus ring via `outline`, keyboard navigation with full arrow/page/home/end support, `aria-live="polite"` on status. This is significantly above average for VS Code extension webviews.

## Codebase Context

The changes replace a 315-line monolithic vanilla DOM script with 19 focused modules totaling ~1200 lines of production code (plus 560 lines of tests). The extension host side (`jsonlWebviewPanel.ts`) was updated to remove server-side search, enforce `maxDisplayedLines`, and provide a new HTML template with ARIA semantics. The core parsing/table-building modules were unchanged except for message type updates, maintaining backward compatibility with the Tree View.

---
*Generated by claude-review skill (Claude multi-agent exploration + synthesis)*
