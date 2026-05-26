## Context

Shell decorations are global runtime chrome objects mounted into header or footer. Their schema and publish path should remain separate from page config, but their authoring experience belongs next to page editing because operators align them against the same FHD shell preview and asset library.

## Goals

- Make `/display-pages/editor` the canonical route for shell decoration authoring.
- Reuse existing shell decoration editor logic instead of rewriting schema or services.
- Preserve separate save/publish status for shared shell config.

## Non-Goals

- Do not merge shell decoration objects into per-page display config.
- Do not change runtime shell decoration schema.
- Do not bundle page publish and shell publish into one action.

## Decisions

### Workspace Model

Display Pages Editor SHALL expose a shell decorations workspace beside page authoring and asset library workspaces. The workspace may use query state for deep linking, but route ownership remains `/display-pages/editor`.

### Lifecycle Separation

The shell workspace SHALL show shell draft/live status and use shell save/publish APIs. Page draft controls SHALL remain page-scoped. If both page and shell have unsaved changes, each workspace must identify its own pending state.

### Shared Preview Foundation

The shell workspace SHALL use the same shell preview foundation as page authoring so header/footer dimensions, dashed guides, and asset picking feel consistent.

## Verification

- Route tests assert shell authoring is available under `/display-pages/editor`.
- Component tests verify shell object selection, inspector edits, and save/publish actions still call shell APIs.
- Regression tests confirm page save/publish does not publish shell drafts and shell publish does not publish page drafts.
