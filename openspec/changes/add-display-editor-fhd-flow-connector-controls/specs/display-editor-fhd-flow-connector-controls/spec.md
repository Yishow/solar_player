## ADDED Requirements

### Requirement: Editor SHALL expose FHD connector treatment controls for supported flow pages

The system SHALL let `/display-pages/editor` expose persisted FHD connector treatment controls for supported Solar and Factory Circuit connector regions.

#### Scenario: Solar connector stroke width is editor-backed

- **GIVEN** the operator is editing a `Solar` connector region
- **WHEN** they change connector stroke width, opacity, line cap, or radius treatment from the inspector
- **THEN** the draft preview SHALL update the connector treatment
- **AND** publishing the draft SHALL make `/solar` render the same connector treatment
- **AND** the connector source and runtime flow data SHALL remain unchanged

#### Scenario: Factory Circuit connector treatment survives publish

- **GIVEN** the operator is editing a `FactoryCircuit` connector region
- **WHEN** they change connector stroke width, opacity, or visual layer treatment from the inspector
- **THEN** the draft preview SHALL show the changed circuit line treatment
- **AND** the published `/factory-circuit` route SHALL use the same persisted values
- **AND** circuit metric data SHALL continue to come from the existing runtime model

### Requirement: Editor SHALL expose page-supported node alignment and icon treatment controls

The system SHALL let `/display-pages/editor` expose persisted node alignment and icon treatment controls for supported Solar and Factory Circuit flow nodes without replacing page-owned source-like icon vocabulary.

#### Scenario: Solar node alignment remains source-like

- **GIVEN** the operator is editing a `Solar` flow node
- **WHEN** they adjust node geometry, icon scale, icon-to-label spacing, or value alignment
- **THEN** the draft preview SHALL keep the page-owned source-like icon
- **AND** publishing the draft SHALL keep the same node treatment in `/solar`
- **AND** the editor SHALL NOT replace the icon with a generic management glyph

#### Scenario: Factory Circuit node treatment does not create management rows

- **GIVEN** the operator is editing a `FactoryCircuit` circuit node
- **WHEN** they adjust node geometry, icon scale, label alignment, or value spacing
- **THEN** the node SHALL remain a playback flow component
- **AND** the editor SHALL NOT convert the surrounding load panel into a management-style table

### Requirement: Unsupported flow treatment controls SHALL stay hidden and seed-backed

The system SHALL hide unsupported FHD flow treatment controls per page and SHALL fall back to seed values when persisted values are missing or invalid.

#### Scenario: Unsupported dash control does not appear

- **GIVEN** a selected connector renderer does not support dash style
- **WHEN** the operator opens the inspector for that connector
- **THEN** dash controls SHALL NOT appear
- **AND** the connector SHALL still render using seed line treatment

#### Scenario: Invalid connector width is rejected without blanking playback

- **GIVEN** the operator enters a connector stroke width outside the allowed FHD range
- **WHEN** validation runs before save or publish
- **THEN** the editor SHALL surface a validation issue for that field
- **AND** preview and playback SHALL continue to use a valid seed or last valid connector width
