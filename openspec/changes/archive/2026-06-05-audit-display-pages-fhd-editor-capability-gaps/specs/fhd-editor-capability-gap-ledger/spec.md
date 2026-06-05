## ADDED Requirements

### Requirement: FHD editor ledger SHALL record current editor coverage for the five playback pages

The system SHALL provide an FHD editor capability gap ledger that records current `/display-pages/editor` coverage for `Overview`, `Solar`, `FactoryCircuit`, `Images`, and `Sustainability`.

#### Scenario: Ledger records Overview coverage from current editor schemas

- **GIVEN** `Overview` is being audited for FHD closeout
- **WHEN** the ledger records current editor coverage
- **THEN** it SHALL cite `overviewDisplayPageEditorRegions` as the active editor-region source
- **AND** it SHALL record existing hero typography, hero media source/placement/effects, summary card style, hero container geometry, gold line, leaf ornament, KPI geometry, KPI card style, and KPI icon-source coverage
- **AND** it SHALL map `Overview` to `docs/reference/FHD/01-1.Overview (大).png`

#### Scenario: Ledger records Solar coverage and unsupported media effects

- **GIVEN** `Solar` is being audited for FHD closeout
- **WHEN** the ledger records current editor coverage
- **THEN** it SHALL cite `solarDisplayPageEditorRegions` as the active editor-region source
- **AND** it SHALL record existing hero typography, hero media source/placement, gold line, leaf ornament, flow node geometry/icon-source, connector geometry, KPI geometry, KPI card style, and KPI icon-source coverage
- **AND** it SHALL record that the Solar hero media effect surface is currently unsupported when current code still marks it unsupported
- **AND** it SHALL map `Solar` to `docs/reference/FHD/02-2.Solar (大).png`

#### Scenario: Ledger records Factory Circuit coverage without management-surface drift

- **GIVEN** `FactoryCircuit` is being audited for FHD closeout
- **WHEN** the ledger records current editor coverage
- **THEN** it SHALL cite `factoryCircuitDisplayPageEditorRegions` as the active editor-region source
- **AND** it SHALL record existing hero typography, copy/status geometry, status block chrome, gold line, leaf ornament, node geometry/icon-source, connector geometry, load panel geometry, load row geometry/icon-source, KPI geometry, and KPI icon-source coverage
- **AND** it SHALL keep load panel and load row surfaces classified as playback display surfaces, not management tables
- **AND** it SHALL map `FactoryCircuit` to `docs/reference/FHD/03-3.Factory Circuit (大).png`

#### Scenario: Ledger records Images coverage for media stage and gallery controls

- **GIVEN** `Images` is being audited for FHD closeout
- **WHEN** the ledger records current editor coverage
- **THEN** it SHALL cite `imagesDisplayPageEditorRegions` as the active editor-region source
- **AND** it SHALL record existing hero typography, copy layout, gold ornament, counter chrome, arrow chrome, main stage source/placement/geometry/effects, info panel geometry/card-style/icon-source, arrow geometry, and thumbnail slot geometry coverage
- **AND** it SHALL map `Images` to `docs/reference/FHD/04-4.Images (大).png`

#### Scenario: Ledger records Sustainability coverage and unsupported media effects

- **GIVEN** `Sustainability` is being audited for FHD closeout
- **WHEN** the ledger records current editor coverage
- **THEN** it SHALL cite `sustainabilityDisplayPageEditorRegions` as the active editor-region source
- **AND** it SHALL record existing hero typography, hero media source/placement/geometry, highlight rail/card-rail child authoring, leaf ornament, period chips, provenance, KPI geometry/card-style/icon-source, and stat geometry/card-style/icon-source coverage
- **AND** it SHALL record that the Sustainability hero media effect surface is currently unsupported when current code still marks it unsupported
- **AND** it SHALL map `Sustainability` to `docs/reference/FHD/05-5.Sustainability (大).png`

### Requirement: Ledger SHALL classify every FHD gap by implementation path

The ledger SHALL classify every recorded FHD gap as `existing-editor-control`, `new-editor-capability`, `non-editor-runtime-gap`, or `accepted-difference`.

#### Scenario: Existing editor control is not duplicated

- **GIVEN** a FHD difference can be resolved by an existing editor field group such as hero typography, card style, media placement, media effects, geometry, icon source, or chrome ornament fields
- **WHEN** the ledger records that difference
- **THEN** it SHALL classify the row as `existing-editor-control`
- **AND** it SHALL name the existing editor region id or field group
- **AND** it SHALL NOT route that row to a new editor capability change

#### Scenario: Missing editor control maps to an editor capability change

- **GIVEN** a FHD difference cannot be represented by current editor fields
- **WHEN** the ledger records that difference
- **THEN** it SHALL classify the row as `new-editor-capability`
- **AND** it SHALL map the row to one of the downstream FHD editor changes or to a proposed new change name
- **AND** it SHALL NOT recommend a page-local CSS-only fix as the final implementation path

#### Scenario: Runtime or asset gap is separated from editor work

- **GIVEN** a FHD difference depends on runtime data, asset governance, route behavior, or playback model behavior
- **WHEN** the ledger records that difference
- **THEN** it SHALL classify the row as `non-editor-runtime-gap`
- **AND** it SHALL name the runtime or asset owner that must be planned separately

#### Scenario: Accepted difference records explicit human acceptance

- **GIVEN** the user accepts a difference from the FHD reference
- **WHEN** the ledger records that difference
- **THEN** it SHALL classify the row as `accepted-difference`
- **AND** it SHALL record the acceptance reason and date

### Requirement: Ledger SHALL use current repo sources and avoid deprecated workflow inputs

The ledger SHALL be grounded in current repo sources and SHALL avoid deprecated prototype or reference-match workflow inputs.

#### Scenario: Active editor source is resolved from page region schemas

- **GIVEN** the contributor audits editor coverage
- **WHEN** they choose code anchors for the ledger
- **THEN** they SHALL use `DisplayPagesEditor`, `pageRegionSchemasByTemplate`, and each page's `*DisplayPageEditorRegions` as the active editor-region source
- **AND** they SHALL NOT treat unused local `build*Regions` helpers in `runtime*.tsx` as authoritative unless implementation proves they are wired into the editor

#### Scenario: Ledger does not depend on reference-match

- **GIVEN** the ledger is created or updated
- **WHEN** validation or review checks the ledger
- **THEN** the ledger SHALL NOT contain `docs/reference-match/`
- **AND** FHD reference paths SHALL point to `docs/reference/FHD/`

### Requirement: Ledger SHALL gate downstream FHD editor changes

The ledger SHALL provide enough detail to decide which downstream FHD editor or witness change SHALL be applied next.

#### Scenario: Downstream change receives a precise scoped gap list

- **GIVEN** a downstream change such as `add-display-editor-fhd-flow-connector-controls` is ready to apply
- **WHEN** the contributor reads the ledger
- **THEN** the ledger SHALL list the rows owned by that change
- **AND** each row SHALL include page, route, FHD reference path, surface, current editor region id, current editor field group, classification, downstream owner, next verification, and notes

#### Scenario: Completion updates ledger rows

- **GIVEN** a downstream FHD editor change has implemented a missing capability
- **WHEN** the downstream change completes
- **THEN** the affected ledger rows SHALL be updated from `new-editor-capability` to `existing-editor-control` or `accepted-difference`
- **AND** the update SHALL include the verification evidence path or test command used for that row
