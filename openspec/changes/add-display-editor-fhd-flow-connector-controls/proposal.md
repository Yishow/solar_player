## Summary

Add editor-backed FHD flow connector and node treatment controls for the Solar and Factory Circuit playback pages.

## Motivation

The Solar and Factory Circuit pages already expose editable flow nodes and connector geometry, but final FHD matching still needs more precise controls for connector thickness, line treatment, node alignment, and source-like icon vocabulary. These values are part of the display composition, not one-off CSS fixes.

This change makes those flow-specific adjustments first-class `/display-pages/editor` capabilities. When the FHD reference requires line weight or node geometry refinements, the editor contract should be extended and the published playback routes should consume the same persisted values.

## Proposed Solution

- Extend the display page editor schema for supported flow and circuit regions with connector treatment tokens such as stroke width, opacity, corner radius, dash style where supported, line cap, and visual depth.
- Keep existing node geometry controls and add alignment/treatment controls needed for FHD matching, including source-like icon scale and icon-to-label spacing where the page supports those fields.
- Apply the same persisted values in editor preview and playback runtime for `/solar` and `/factory-circuit`.
- Preserve current runtime data bindings, MQTT/circuit metrics, icon registry source, route behavior, and page shell.

## Non-Goals

- Do not add typography, card rhythm, media crop, photo fade, ornament opacity, or ring overlap controls.
- Do not replace page-specific flow diagrams with a generic diagram editor.
- Do not convert Factory Circuit load data into a management table or backend dashboard surface.
- Do not introduce screenshot automation or asset manifests in this change.

## Alternatives Considered

- Page-local CSS tuning only: rejected because flow line weight and node geometry would drift outside the editor.
- A generic graph editor: rejected because the product needs a fixed FHD playback composition, not arbitrary diagram authoring.
- Merge with typography/rhythm controls: rejected because flow geometry and connector treatment have different page support and test coverage.

## Impact

- Affected specs: display-editor-fhd-flow-connector-controls
- Affected code:
  - Modified:
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
    - apps/web/src/pages/displayPageIconSourceMode.test.ts
    - apps/web/src/pages/Solar/configRender.test.ts
    - apps/web/src/pages/Solar/displayPageConfig.ts
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/Solar/layout.test.ts
    - apps/web/src/pages/Solar/solar.css
    - apps/web/src/pages/FactoryCircuit/configRender.test.ts
    - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
    - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
    - apps/web/src/pages/FactoryCircuit/index.tsx
    - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - New:
    - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
    - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - Removed: (none)
