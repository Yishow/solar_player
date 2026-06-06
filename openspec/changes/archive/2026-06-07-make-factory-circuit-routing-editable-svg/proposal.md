## Why

Factory Circuit routing and fan-out lines are currently hard to read because the visible route geometry comes from baked PNG overlays. The existing connector treatment config can scale those images but cannot make crisp, editable strokes that match docs/reference/FHD/03-3.Factory Circuit (大).png.

## What Changes

- Replace Factory Circuit PNG routing overlays with config-driven inline SVG paths for PV to inverter, inverter to switchboard, inverter drop, and switchboard to load rows.
- Drive SVG routing endpoints from the resolved Factory Circuit nodes and loadRows geometry so routing tracks editor-maintainable layout changes.
- Extend shared flow connector treatment config with strokeColor so stroke width, opacity, and color are editable through the same connector treatment path.
- Wire the strokeColor inspector field beside existing connector treatment controls.
- Remove only the now-unused Factory Circuit routing PNG imports from the runtime component; leave assets on disk untouched.

## Non-Goals

- Do not redesign Factory Circuit nodes, load cards, shared header/footer, shell layout, route structure, API, SQLite, MQTT, or publishing data model.
- Do not change Overview, Solar, Images, Sustainability, or other playback page routing behavior beyond the shared strokeColor default field being available.
- Do not delete existing PNG asset files; this change only stops Factory Circuit runtime from using the four routing overlay imports.
- Do not introduce page-local hardcoded routing colors that bypass connectorTreatments.

## Capabilities

### New Capabilities

- `factory-circuit-svg-routing`: Factory Circuit renders crisp SVG routing from page geometry and editable connector treatment values instead of baked PNG overlays.

### Modified Capabilities

- `display-editor-fhd-flow-connector-controls`: Connector treatment controls include a CSS color string field for stroke color while preserving existing stroke width, opacity, radius, and line cap behavior.

## Impact

- Affected specs: factory-circuit-svg-routing, display-editor-fhd-flow-connector-controls
- Affected code:
  - New: apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - Modified: apps/web/src/pages/FactoryCircuit/index.tsx, apps/web/src/pages/FactoryCircuit/factoryCircuit.css, apps/web/src/pages/FactoryCircuit/configRender.test.ts, apps/web/src/pages/FactoryCircuit/displayPageConfig.ts, apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts, apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - Removed: none
