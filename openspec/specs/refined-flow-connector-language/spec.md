# refined-flow-connector-language Specification

## Purpose

TBD - created by archiving change 'refine-flow-connector-visual-language'. Update Purpose after archive.

## Requirements

### Requirement: Unified thin sage flow-connector treatment

Solar and Factory flow connectors SHALL share a refined thin sage-green visual language. Solar connector stroke widths SHALL be reduced from their over-thick values while preserving the main-thicker-than-CO2 relationship, and Factory routing stroke color SHALL match Solar's sage color.

#### Scenario: Solar connectors are thinned

- **WHEN** the Solar seed config resolves
- **THEN** the main connector stroke widths are thinner than the prior 11px
- **AND** the CO2 connector remains thinner than the main connectors

##### Example: Solar connector widths

| Connector | Before | After |
| ----- | ----- | ----- |
| solarToInverter | 11 | 6 |
| inverterToCo2 | 7 | 4 |

#### Scenario: Factory routing color matches Solar

- **WHEN** the Factory seed config resolves
- **THEN** the connector treatment stroke color equals Solar's sage color `#527d3b`


<!-- @trace
source: refine-flow-connector-visual-language
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - data/server-runtime.lock.json
tests:
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
-->

---
### Requirement: Structured Factory routing fan-out

Factory load routing SHALL render as a structured comb (a near-load vertical bus with short branches) derived from resolved node and load-row geometry, rather than a single-point spray.

#### Scenario: Load branches share a near-load vertical bus

- **WHEN** Factory routing renders
- **THEN** each load route routes through a shared vertical bus positioned near the load rows
- **AND** the routing path geometry derives from resolved node/load-row config (no hardcoded absolute path)

<!-- @trace
source: refine-flow-connector-visual-language
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - data/server-runtime.lock.json
tests:
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
-->