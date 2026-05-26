## Context

Asset references are already structured, but editor pickers do not expose the information needed to choose well. A gallery-backed picker should reuse the managed asset catalog data and stay lightweight enough for inspector use.

## Goals

- Make asset selection visual and contextual.
- Prevent shell-only assets from appearing in page-only pickers and page-only assets from appearing in shell-only pickers.
- Provide a clear path from picker to integrated asset workspace when upload or deeper inspection is needed.

## Non-Goals

- Do not replace Asset Library management in this change.
- Do not change image upload API or asset reference schema.
- Do not add asset editing metadata controls inside every picker.

## Decisions

### Picker Card Model

The picker SHALL render eligible assets as cards with thumbnail, label, category, and usage scope. The currently selected asset SHALL show a preview and stable selected state.

### Eligibility Filtering

Page object pickers SHALL hide `shell-only` assets. Shell decoration pickers SHALL hide `page-only` assets. Shared `both` assets remain available in both contexts.

### Asset Workspace Link

The picker SHALL provide an action to open the integrated asset library workspace while preserving return context to the original inspector selection.

## Verification

- Tests cover thumbnail/card rendering and current selection.
- Tests cover page-vs-shell eligibility filtering.
- Tests cover the link or callback into the integrated asset workspace.
