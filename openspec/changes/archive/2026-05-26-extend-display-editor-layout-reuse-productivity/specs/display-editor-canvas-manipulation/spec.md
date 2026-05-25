## MODIFIED Requirements

### Requirement: Support zoom, pan, and keyboard nudge during canvas editing

The system SHALL support zoom, pan, and keyboard nudge controls during display editor canvas editing. Keyboard nudging SHALL provide explicit step tiers so operators can choose fine, normal, or accelerated movement without leaving the canvas workflow.

#### Scenario: Operator nudges a selected region

- **WHEN** a region is selected and the operator uses keyboard nudge controls
- **THEN** the region moves by the configured increment
- **AND** the movement remains visible in the canvas preview

##### Example: Arrow key nudge moves Solar node by one step

- **GIVEN** a `Solar` flow node is selected
- **WHEN** the operator presses the right-arrow nudge shortcut once
- **THEN** that region moves by the configured single-step increment
- **AND** the preview reflects the nudge without requiring manual number entry

#### Scenario: Operator chooses a different nudge step tier

- **WHEN** a region is selected and the operator invokes a fine or accelerated nudge tier
- **THEN** the region moves by the design-space increment assigned to that tier
- **AND** the editor keeps that nudge inside the same undoable draft history workflow

##### Example: Accelerated nudge moves a KPI card by ten pixels

- **GIVEN** a KPI card is selected on the canvas
- **WHEN** the operator triggers the accelerated nudge tier once toward the right
- **THEN** the card moves right by `10` design-space pixels
- **AND** the operator can undo that move from the draft history
