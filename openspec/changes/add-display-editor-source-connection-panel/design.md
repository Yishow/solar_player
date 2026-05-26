## Context

Source controls now appear as ordinary inspector fields. That works for simple text editing, but it fails once the editor must support seed asset bootstrap, managed visual replacement, gallery-backed picker, and per-surface fallbacks. Operators need one place to answer: "What is this selected thing connected to, and how do I replace it?"

## Goals

- Add a dedicated right-side `來源連接` tab in `/display-pages/editor`.
- Keep source controls separated from presentation controls.
- Make source status consistent across media, page freeform objects, card icons, visual primitives, and shell workspace integrations.
- Provide navigation into the integrated asset library workspace without losing the selected editor context.

## Non-Goals

- Do not move blur, fade, opacity, geometry, text, layout, or effect controls into the source tab.
- Do not implement seed asset bootstrap or managed visual replacement in this change.
- Do not remove existing inspector fields until replacement behavior is implemented and verified.

## Decisions

### Right Panel Navigation

The editor SHALL add `來源連接` as a right-side tab beside `屬性`, `素材健康`, and `發布`. The tab is selected manually and SHALL preserve the current selected region or object.

### Source Connection Resolver

The panel SHALL derive source connection rows from the selected editor item and its resolved fields. Rows SHALL represent supported source types including media source mode, managed asset id, direct src, seed default, icon registry, reference glyph, ornament key, or fallback source. The resolver SHALL tolerate unsupported selections and show an empty-state explanation.

### Source Actions

When the selected item supports source replacement, the panel SHALL expose actions for:

- choose or replace from gallery
- open the integrated asset library workspace
- restore seed/default source when available
- jump back to `屬性` for presentation settings

Actions that depend on pending capabilities SHALL render as disabled with a clear reason until the related capability is implemented.

### Effects Summary Boundary

The source panel SHALL display a read-only summary of image effects or visual presentation settings that apply to the selected source, such as blur, edge fade, opacity, or fit mode. The controls for those settings stay in `屬性`. The source panel provides a jump action back to `屬性` instead of duplicating controls.

## Verification

- Route tests assert the right-side `來源連接` tab renders and preserves selection context.
- Component tests cover media source, managed asset, direct src, icon registry/glyph, ornament key, and unsupported selection summaries.
- Tests cover effect summary display without duplicating effect controls.
