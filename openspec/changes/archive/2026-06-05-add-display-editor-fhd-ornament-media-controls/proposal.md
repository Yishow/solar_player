## Summary

Add editor-maintainable FHD ornament, photo fade, and media-stage controls for the five playback pages.

## Motivation

The FHD reference quality depends heavily on non-data visual surfaces: photo fade softness, hero/main media crop, leaf watermark opacity, gold-line thickness, ring ornament overlap, and media-stage framing. These details are currently easy to overfit with page-local CSS. Because every playback page is expected to be maintained through `/display-pages/editor`, these visual controls should be persisted editor capabilities.

## Proposed Solution

- Extend display page editor config with FHD ornament and media treatment token groups.
- Expose inspector controls for photo fade opacity/stop, media crop/focus/framing, leaf/ring ornament opacity, scale, offset, z-layer, and gold-line thickness where supported.
- Apply the same persisted treatment in editor preview and playback runtime.
- Keep media source selection, playlist selection, story data, and shell layout unchanged.

## Non-Goals

- Do not add typography/card rhythm controls; those belong to `add-display-editor-fhd-typography-rhythm-controls`.
- Do not add Solar or Factory connector controls; those belong to `add-display-editor-fhd-flow-connector-controls`.
- Do not replace the asset library or image playlist model.
- Do not add visual regression tooling in this change.

## Alternatives Considered

- Page-local CSS changes for each reference difference: rejected because they bypass the editor and cannot be maintained by operators.
- One generic ornament editor for all decorative surfaces: rejected because page-specific ornaments have different renderer constraints.

## Impact

- Affected specs: display-editor-fhd-ornament-media-controls
- Affected code:
  - Modified:
    - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
    - apps/web/src/pages/shared/displayPageChromeConfig.ts
    - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
    - apps/web/src/pages/shared/displaySurfaceChrome.css
    - apps/web/src/pages/Solar/displayPageConfig.ts
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/FactoryCircuit/index.tsx
    - apps/web/src/pages/Sustainability/displayPageConfig.ts
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/Sustainability/sustainability.css
    - affected page config/render/style tests
  - New: (none)
  - Removed: (none)
