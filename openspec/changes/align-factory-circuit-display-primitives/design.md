## Context

`FactoryCircuit` currently carries the most bespoke playback-page visual implementation. Its node cards, load rows, routing lines, and KPI cards are all page-local. This is understandable because the page has unique electrical topology, but the KPI and node surfaces now diverge from the display card family that has already formed around `Solar` and `Overview`.

The desired outcome is not to make Factory look like Solar. The desired outcome is to make it feel like the same display-wall product: shared card rhythm, shared icon/surface language, refined routing lines, and a topology that remains readable from a distance.

## Goals / Non-Goals

**Goals:**

- Move Factory KPI cards onto the shared metric-card family or a direct wrapper of it.
- Define a shared display node vocabulary usable by Factory circuit nodes and Solar flow nodes.
- Refine routing line visual treatment without changing routing topology or live status semantics.
- Keep load rows functionally intact while aligning their surface tokens with the display family.

**Non-Goals:**

- No new data model or MQTT mapping.
- No slot binding redesign.
- No topology coordinate changes.
- No rewrite of Solar flow nodes in this change, except to define a compatible future primitive vocabulary.

## Decisions

### Adopt shared metric-card primitives for Factory KPI cards

Factory KPI cards should use the same frame/header/value/footer rhythm as the rest of the display metric family. Page-specific content such as routing labels and compact value sizing can be passed through slots and CSS variables rather than maintained as a separate absolute-position skeleton.

### Define display circuit nodes as a sibling of flow nodes, not as KPI cards

Circuit nodes and Solar flow nodes are semantic nodes, not metrics. They should share surface language, icon sizing, label/subtitle/value spacing, and optional status accents, but they should not be forced into the metric-card primitive. A `DisplayNodeFrame` or shared CSS vocabulary is the right abstraction.

### Keep routing topology fixed while refining stroke treatment

Routing SVG and connectors remain responsible for communicating electrical flow. The change may adjust stroke color tokens, endpoint glow, dashed line treatment, and accent tones, but cannot change the underlying topology or status mapping.

### Keep load rows outside metric-card scope

Load rows are compact status rows and do not need to become KPI cards. They should align through shared surface tokens and icon/status rhythm while preserving row density.

## Implementation Contract

**Behavior**

- Factory KPI cards SHALL use the shared metric-card family or a wrapper with the same frame/header/value/footer rhythm.
- Factory KPI cards SHALL keep their current card count, data binding, and FHD geometry.
- Factory circuit nodes SHALL use a shared display node vocabulary for surface, icon, label, subtitle, and optional value treatment.
- Factory routing lines SHALL preserve topology and status semantics while using display-family stroke/accent tokens.
- Load rows SHALL keep their information density and status behavior while adopting shared surface and token language.

**Interface / data shape**

- Existing Factory view model and runtime config shapes remain valid.
- Existing slot binding and alert semantics remain valid.
- Shared display primitives are frontend-only and do not require backend changes.

**Failure modes**

- If a circuit node lacks an icon, it still renders readable label/subtitle/value text inside the same geometry.
- If a routing status is unknown, the route uses neutral display line styling rather than disappearing.
- If a KPI footer has no sparkline or detail, the metric card remains balanced and readable.

**Acceptance criteria**

- `/factory-circuit` keeps existing topology, geometry, load rows, and data binding.
- Factory KPI cards visually align with the shared metric-card family used elsewhere.
- Circuit nodes and routing lines read as part of the same display family as Solar/Overview without losing Factory-specific semantics.
- `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` succeeds.
- `spectra validate --strict --changes align-factory-circuit-display-primitives` succeeds.

## Risks / Trade-offs

- **Risk:** Over-sharing with Solar makes Factory lose circuit semantics.  
  **Mitigation:** Use a sibling node vocabulary, not the metric-card primitive.
- **Risk:** KPI migration changes text wrapping or value size.  
  **Mitigation:** Preserve geometry and allow CSS variable overrides for compact Factory variants.
- **Risk:** Routing visual polish accidentally changes status meaning.  
  **Mitigation:** Keep topology/status mapping fixed and limit work to tokenized stroke treatment.
