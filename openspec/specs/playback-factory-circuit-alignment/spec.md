# playback-factory-circuit-alignment Specification

## Purpose

Define the Factory Circuit playback layout, status behavior, Jungli six-row geometry, and installed-config migration contract.

## Requirements

### Requirement: Align the factory circuit page as a standalone flow-heavy playback batch

The implementation SHALL align `/factory-circuit` as a standalone playback batch dedicated to `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`.

#### Scenario: The factory circuit batch starts

- **WHEN** this playback batch begins
- **THEN** it only covers `/factory-circuit`
- **AND** it treats flow composition and circuit-card density as the primary alignment target

##### Example:

- **GIVEN** the earlier overview and solar batch already exists
- **WHEN** this change is applied
- **THEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html` maps only to `/factory-circuit`
- **AND** no media-heavy playback page is included in the same batch


<!-- @trace
source: align-solar-display-playback-factory-circuit
updated: 2026-07-16
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/layout.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
tests:
  - apps/web/src/pages/FactoryCircuit/layout.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
-->

---
### Requirement: Preserve circuit threshold and empty-state behavior

The implementation SHALL preserve threshold-driven status mapping and empty-state behavior for `/factory-circuit`.

#### Scenario: Circuit data is present or missing

- **WHEN** the page receives circuit rows or an empty result
- **THEN** it renders a consistent status mapping and a readable fallback state
- **AND** the visual migration does not collapse the route when data is absent

##### Example:

- **GIVEN** the circuits API returns an empty list
- **WHEN** `/factory-circuit` renders
- **THEN** the route still shows its prototype-aligned sections with an intentional empty-state treatment
- **AND** it does not render broken connectors or missing labels


<!-- @trace
source: align-solar-display-playback-factory-circuit
updated: 2026-07-16
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
-->

---
### Requirement: Center the six Jungli project rows on the switchboard routing line

The implementation SHALL render the Jungli `stamping`, `body`, `painting`, `assembly`, `utility`, and `office` rows in that order with 84px row height, 95px vertical step, and a group center at FHD Y coordinate 440.

#### Scenario: Rendering the Jungli six-row layout

- **GIVEN** the current Jungli six-slot contract is active
- **WHEN** `/factory-circuit` renders at 1920x1080
- **THEN** row top coordinates SHALL be `160`, `255`, `350`, `445`, `540`, and `635`
- **AND** no adjacent rows SHALL overlap
- **AND** every routing endpoint SHALL terminate at the vertical center of its corresponding row
- **AND** the routing group center SHALL align with the switchboard horizontal line at Y coordinate 440


<!-- @trace
source: align-solar-display-playback-factory-circuit
updated: 2026-07-16
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/layout.ts
tests:
  - apps/web/src/pages/FactoryCircuit/layout.test.ts
-->

---
### Requirement: Normalize legacy persisted Jungli configuration

The deployment migration SHALL convert legacy `factory-circuit` persisted config and metadata to the current six-slot contract without changing Guanyin or unrelated editor fields.

#### Scenario: Migrating an installed Pi with legacy row keys

- **GIVEN** base, draft, or live `factory-circuit` config contains `production`, `hvac`, `lighting`, `office`, `ev`, or `infrastructure` load-row keys
- **WHEN** database migrations run
- **THEN** each config SHALL contain the current `stamping`, `body`, `painting`, `assembly`, `utility`, and `office` row geometry
- **AND** the six top coordinates SHALL be `160`, `255`, `350`, `445`, `540`, and `635`
- **AND** unrelated config fields SHALL remain unchanged
- **AND** `factory-circuit-guanyin` config SHALL remain unchanged

#### Scenario: Migrating legacy circuit and topic metadata

- **GIVEN** legacy Jungli circuit rows and an incorrect `factoryOfficePower` display name exist
- **WHEN** database migrations run
- **THEN** legacy `production`, `hvac`, `lighting`, `ev`, and `infrastructure` rows SHALL be disabled
- **AND** the current six Jungli slots SHALL remain enabled
- **AND** the office row SHALL identify `事務系` and `Office & Administration`
- **AND** the `factoryOfficePower` topic display names SHALL match the office row
- **AND** running the migration again SHALL not change the resulting state

<!-- @trace
source: align-solar-display-playback-factory-circuit
updated: 2026-07-16
code:
  - apps/server/src/db/migrations/024_fix_factory_circuit_jungli_region_rows.sql
  - apps/server/src/db/migrations/023_normalize_factory_circuit_jungli_rows.sql
tests:
  - apps/server/src/db/migrations/factoryCircuitJungliRows.test.ts
-->
