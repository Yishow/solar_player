## Summary

Add editor-maintainable FHD typography and rhythm controls for the five playback pages so closeout polish does not require page-local hardcoding.

## Motivation

The five playback pages already have React implementations and editor-backed draft/live publishing, but final FHD polish still depends on details such as hero line-height, eyebrow spacing, caption typography, KPI card height, and card rail rhythm. These are exactly the kinds of changes that would drift if implemented only in page-local CSS.

This change makes those fine adjustments part of the `/display-pages/editor` contract. If a page needs FHD text or rhythm tuning, the operator and future AI implementers should adjust persisted editor controls, not patch the rendered page directly.

## Proposed Solution

- Extend the display page editor schema with FHD typography and rhythm token groups for supported hero, caption, KPI/card, and highlight regions.
- Expose inspector controls for title/eyebrow/lead line-height, letter spacing, font size, value-row rhythm, card padding, card height, footer gap, caption text size, and thumbnail/caption density where the page supports those surfaces.
- Apply the same persisted values in editor preview and playback runtime for `/overview`, `/solar`, `/factory-circuit`, `/images`, and `/sustainability`.
- Keep content, data binding, media source, icon source, shell layout, and route behavior unchanged.

## Non-Goals

- Do not add ornament opacity, ring overlap, photo fade, or media crop controls; those belong to `add-display-editor-fhd-ornament-media-controls`.
- Do not add flow connector thickness or node path controls; those belong to `add-display-editor-fhd-flow-connector-controls`.
- Do not introduce screenshot tooling or asset manifests in this change.
- Do not rewrite the playback shell, server API, SQLite schema, MQTT behavior, or route model.

## Alternatives Considered

- Page-local CSS tuning only: rejected because it bypasses the editor and makes later maintenance dependent on code edits.
- One large FHD polish change: rejected because typography, media/ornaments, flow connectors, and tooling have different ownership and verification paths.

## Impact

- Affected specs: display-editor-fhd-typography-rhythm-controls
- Affected code:
  - Modified:
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
    - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
    - apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts
    - apps/web/src/pages/shared/displayCardStyleConfig.ts
    - apps/web/src/pages/shared/displayPageChromeConfig.ts
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/Solar/displayPageConfig.ts
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/Solar/solar.css
    - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
    - apps/web/src/pages/FactoryCircuit/index.tsx
    - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
    - apps/web/src/pages/Images/displayPageConfig.ts
    - apps/web/src/pages/Images/index.tsx
    - apps/web/src/pages/Images/images.css
    - apps/web/src/pages/Sustainability/displayPageConfig.ts
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/Sustainability/sustainability.css
  - New:
    - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - Removed: (none)
