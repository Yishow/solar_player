## ADDED Requirements

### Requirement: Represent composable media effects as an editable layer list in Properties

The system SHALL represent composable media effects as an editable layer list in the `屬性` panel for eligible media surfaces.

#### Scenario: Operator adds a second effect layer

- **WHEN** the operator edits an eligible media surface in `屬性`
- **THEN** they can add a second effect layer without replacing the first
- **AND** each layer retains its own kind, zone, and parameter fields

##### Example: Operator keeps mist and adds blur

- **GIVEN** a media source already has one mist layer
- **WHEN** the operator adds a blur layer
- **THEN** both layers remain editable in the inspector
- **AND** the blur layer does not overwrite the mist layer

### Requirement: Route visible canvas selections to the owning media effect source

The system SHALL route visible container selections to the owning media effect source before rendering the editable effect inspector.

#### Scenario: Operator clicks a hero container on canvas

- **WHEN** the operator clicks a visible hero container that is not itself the effect data owner
- **THEN** the editor routes authoring to the owning media source
- **AND** the effect inspector becomes available without requiring a manual region-tree detour

##### Example: Background container opens the real effect owner

- **GIVEN** the visible background frame belongs to a media source region
- **WHEN** the operator clicks that frame
- **THEN** the editor opens the effect controls for the owning media source
- **AND** the user does not have to guess the internal authoring node

### Requirement: Keep Source Connection effect information summary-only

The system SHALL keep Source Connection effect information summary-only while editable composable effect controls remain in `屬性`.

#### Scenario: Operator inspects effect state in Source Connection

- **WHEN** the operator opens `來源連接` for a media source with active effect layers
- **THEN** the panel summarizes the effect stack
- **AND** it does not render editable effect fields there

##### Example: Source Connection shows stack summary only

- **GIVEN** a media source has multiple active effect layers
- **WHEN** the operator opens `來源連接`
- **THEN** the active stack is summarized
- **AND** editable controls remain only in `屬性`
