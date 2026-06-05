## Context

The current editor can already persist text, geometry, media placement, card style, page chrome, and related display-page settings. The remaining FHD typography gaps are more specific: distance-readable hero hierarchy, bilingual line-height, KPI/card vertical rhythm, and page-specific caption density. These details must be editor-maintainable because every playback page is expected to be maintained from `/display-pages/editor`.

## Goals / Non-Goals

**Goals:**

- Add persisted FHD typography and rhythm controls for the five playback pages.
- Keep preview, draft save, publish, and playback runtime reading the same persisted values.
- Make unsupported controls invisible per page or region.
- Preserve current content, data sources, shell layout, route behavior, media source, and icon source.

**Non-Goals:**

- Ornament opacity, ring overlap, photo fade, and media crop.
- Solar/Factory connector thickness and flow path styling.
- Visual regression automation.
- Any backend or deployment architecture change.

## Decisions

### Use a narrow FHD rhythm token group instead of raw CSS fields

The editor SHALL expose named tokens for FHD typography and rhythm rather than arbitrary CSS. The token group SHOULD cover line-height, letter spacing, font size, weight, vertical gap, card height, padding, footer gap, and density values. This keeps the editor powerful enough for FHD closeout while preventing it from becoming a general CSS editor.

### Keep region support page-specific

Not every page owns the same surfaces. `Overview` needs hero typography and five KPI card rhythm; `Images` needs caption and thumbnail/caption density; `FactoryCircuit` needs title/copy rhythm and load row typography; `Sustainability` needs hero/lead hierarchy plus stat card rhythm. Each page SHALL expose only controls that its seed config and runtime renderer can consume.

### Treat missing controls as editor capability gaps

If a FHD typography or rhythm adjustment cannot be represented through the editor, implementation SHALL extend the schema, inspector, preview, and runtime contract. It SHALL NOT patch only page-local CSS to satisfy a one-time screenshot difference.

## Implementation Contract

- **Behavior**: Selecting a supported hero, card, caption, KPI, stat, or load-row region in `/display-pages/editor` SHALL show FHD typography/rhythm controls. Editing those controls SHALL update draft preview immediately and SHALL survive save/publish into playback runtime.
- **Interface / data shape**: The persisted config SHALL store FHD typography and rhythm tokens separately from geometry, media source, icon source, and story data. Existing card style and chrome config MAY be reused where they already own the relevant surface, but any new tokens SHALL remain editor-addressable and resettable.
- **Failure modes**: Missing or invalid token values SHALL fall back to seed baseline. Invalid values SHALL surface validation feedback in the editor and SHALL NOT blank the page.
- **Acceptance criteria**:
  - `/overview` hero line-height and five KPI card rhythm can be changed from the editor and reflected in playback.
  - `/solar` KPI vertical rhythm can be changed from the editor without changing flow data.
  - `/factory-circuit` title/copy/load-row typography controls are editor-backed and do not turn the load panel into a management table.
  - `/images` caption card typography and thumbnail/caption density are editor-backed.
  - `/sustainability` hero hierarchy and Trees/stat card rhythm are editor-backed.
  - Targeted tests cover schema exposure, fallback, preview/runtime parity, and validation.
- **Scope boundaries**:
  - In scope: editor schema, inspector controls, page seed configs, preview/runtime token consumption, page-local CSS variable consumption.
  - Out of scope: media/ornament controls, flow connector controls, visual tooling, server API shape changes.

## Risks / Trade-offs

- [Risk] Too many fine-grained fields make the inspector noisy. Mitigation: group fields by FHD surface and expose only page-supported controls.
- [Risk] Existing card style/chrome configs overlap with new controls. Mitigation: reuse existing config groups when they already own the behavior; create new rhythm config only for uncovered FHD-specific gaps.
- [Risk] Operators may enter values that hurt distance readability. Mitigation: add ranges and seed reset for every numeric token.
