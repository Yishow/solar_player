## Context

Solar and Factory Circuit are the two playback pages with explicit flow/circuit geometry. The editor currently exposes node and connector rectangles, which is useful for placement but not enough for the last FHD polish pass. The remaining gaps include connector stroke weight, line caps, opacity, visual layering, icon scale, and small alignment differences that are visible on a 1920x1080 display.

These controls must stay page-supported and display-first. A kiosk playback flow should not become a general diagramming tool, and Factory Circuit must not drift toward a management-surface load table.

## Goals / Non-Goals

**Goals:**

- Add persisted connector treatment controls for Solar and Factory Circuit.
- Add persisted node treatment/alignment controls where the page already owns flow nodes.
- Keep preview, draft save, publish, and playback runtime reading the same persisted values.
- Preserve source-like icons and existing runtime metric/data bindings.

**Non-Goals:**

- Typography, card rhythm, media crop, ornaments, or screenshot tooling.
- Generic graph editing, arbitrary path drawing, or end-user diagram creation.
- Any backend, MQTT, circuit metrics, route, or deployment change.

## Decisions

### Use flow treatment tokens instead of arbitrary CSS

The editor SHALL expose named flow treatment tokens instead of raw CSS fields. The token group SHOULD cover connector stroke width, opacity, line cap, radius/turn treatment, z-layer, source-like icon scale, icon-to-label spacing, and optional dash style only when the renderer supports it.

### Keep the topology seed-owned

The editor SHALL let operators tune the FHD appearance of existing flow nodes and connectors, but it SHALL NOT let them create new graph topology, rebind runtime metrics, or replace page-owned source vocabulary. Node and connector keys remain seed-defined so playback remains stable.

### Treat missing connector controls as editor gaps

If a FHD connector or node treatment adjustment cannot be represented through `/display-pages/editor`, implementation SHALL extend the editor schema and runtime consumption path. It SHALL NOT apply page-local hardcoded CSS as the only fix.

## Implementation Contract

- **Behavior**: Selecting a supported Solar or Factory Circuit flow node/connector in `/display-pages/editor` SHALL show geometry plus flow treatment controls. Editing those controls SHALL update draft preview immediately and SHALL survive save/publish into playback runtime.
- **Interface / data shape**: The persisted config SHALL store flow treatment tokens separately from geometry, media, icon source, text content, and runtime metric data. Existing geometry paths MAY continue to hold rectangle placement.
- **Failure modes**: Missing or invalid treatment values SHALL fall back to seed baseline. Invalid values SHALL surface validation feedback and SHALL NOT make connectors disappear unless the seed itself is intentionally hidden.
- **Acceptance criteria**:
  - `/solar` connector stroke width and node treatment can be changed from the editor and reflected in playback.
  - `/factory-circuit` circuit connector stroke width, connector opacity, and node icon scale can be changed from the editor and reflected in playback.
  - Source-like icons remain page-owned and are not replaced by generic management glyphs.
  - Factory Circuit load panels remain playback display components, not editable management tables.
  - Targeted tests cover schema exposure, unsupported control hiding, fallback, and preview/runtime parity.
- **Scope boundaries**:
  - In scope: editor schema, inspector controls, flow treatment config, Solar/FactoryCircuit seed configs, preview/runtime token consumption, page-local CSS variable consumption.
  - Out of scope: data bindings, MQTT/circuit routes, media/ornaments, typography/card rhythm, screenshot tooling.

## Risks / Trade-offs

- [Risk] Connector controls could become too generic. Mitigation: keep topology seed-owned and expose only supported treatment tokens.
- [Risk] More numeric fields can make inspector scanning harder. Mitigation: group them under flow connector and flow node sections.
- [Risk] CSS variable wiring may overlap with existing geometry controls. Mitigation: keep rectangle placement and treatment tokens separate.
