# factory-circuit-svg-routing Specification

## Purpose

TBD - created by archiving change 'make-factory-circuit-routing-editable-svg'. Update Purpose after archive.

## Requirements

### Requirement: Factory Circuit SHALL render routing as editable SVG strokes

Factory Circuit SHALL render circuit routing with inline SVG path elements instead of PNG routing overlay images. The SVG routing SHALL use the resolved connector treatment values for stroke width, opacity, and stroke color.

#### Scenario: Routing uses SVG instead of PNG overlays

- **WHEN** the Factory Circuit playback page renders
- **THEN** it SHALL render an SVG routing overlay for PV, inverter, switchboard, and load row fan-out paths
- **AND** it SHALL NOT render runtime img elements with the factory-circuit-routing-reference class

#### Scenario: Routing treatment comes from connector config

- **WHEN** the resolved Factory Circuit connector treatment has strokeWidth, opacity, and strokeColor values
- **THEN** every SVG routing path SHALL apply strokeWidth to the stroke-width attribute
- **AND** every SVG routing path SHALL apply opacity to the opacity attribute
- **AND** every SVG routing path SHALL apply strokeColor to the stroke attribute

##### Example: Connector treatment attributes

| Config field | Example value | SVG attribute |
| ----- | ----- | ----- |
| strokeWidth | 9 | stroke-width="9" |
| opacity | 0.82 | opacity="0.82" |
| strokeColor | #4ade80 | stroke="#4ade80" |


<!-- @trace
source: make-factory-circuit-routing-editable-svg
updated: 2026-06-07
code:
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Factory Circuit SVG routing SHALL derive endpoints from config geometry

Factory Circuit SVG routing SHALL derive path endpoints from the resolved display page config nodes and loadRows geometry. The implementation SHALL NOT hardcode endpoint coordinates that bypass node or load row geometry.

#### Scenario: Primary route tracks node geometry

- **WHEN** PV, inverter, and switchboard nodes are present in resolved config
- **THEN** the SVG routing path from PV to inverter to switchboard SHALL use coordinates computed from those node geometries
- **AND** changing a node geometry in config SHALL change the computed path coordinates

#### Scenario: Load fan-out tracks load row geometry

- **WHEN** six load rows are present in resolved config
- **THEN** SVG routing SHALL render six load fan-out paths from the switchboard route toward the row attachment points
- **AND** each fan-out endpoint SHALL be computed from that load row geometry

##### Example: Geometry source ownership

| Route segment | Required source geometry | Rejected source |
| ----- | ----- | ----- |
| PV to inverter | nodes entries for PV and inverter | PNG image dimensions |
| Inverter to switchboard | nodes entries for inverter and switchboard | page-local fixed endpoint constants |
| Switchboard to load row | loadRows entry for that row | hardcoded row y-position |


<!-- @trace
source: make-factory-circuit-routing-editable-svg
updated: 2026-06-07
code:
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Factory Circuit SVG routing SHALL preserve playback circuit language

Factory Circuit SVG routing SHALL preserve the source-like circuit visual language and fan-out topology. It SHALL NOT convert the circuit into a management table, generic dashboard panel, or settings-style surface.

#### Scenario: Fan-out remains a playback circuit surface

- **WHEN** routing lines render for the six load rows
- **THEN** the lines SHALL visually connect switchboard output to the load rows
- **AND** the existing load row content, node vocabulary, shared header, and shared footer SHALL remain outside this routing replacement

<!-- @trace
source: make-factory-circuit-routing-editable-svg
updated: 2026-06-07
code:
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->