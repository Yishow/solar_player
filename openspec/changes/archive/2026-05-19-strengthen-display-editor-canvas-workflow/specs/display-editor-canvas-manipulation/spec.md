## ADDED Requirements

### Requirement: Manipulate display editor geometry directly on canvas

The system SHALL let operators manipulate editable region geometry directly on the display editor canvas.

#### Scenario: Operator drags or resizes a region

- **WHEN** the operator drags or resizes an editable region on the canvas
- **THEN** the draft geometry updates to match that interaction
- **AND** the preview reflects the geometry change immediately

##### Example: Operator drags Overview hero copy to the right

- **GIVEN** the `Overview Hero Copy` region is selected in the editor
- **WHEN** the operator drags that region `24` pixels to the right
- **THEN** the draft `left` value updates by `24`
- **AND** the preview immediately shows the hero copy in the new position

### Requirement: Support zoom, pan, and keyboard nudge during canvas editing

The system SHALL support zoom, pan, and keyboard nudge controls during display editor canvas editing.

#### Scenario: Operator nudges a selected region

- **WHEN** a region is selected and the operator uses keyboard nudge controls
- **THEN** the region moves by the configured increment
- **AND** the movement remains visible in the canvas preview

##### Example: Arrow key nudge moves Solar node by one step

- **GIVEN** a `Solar` flow node is selected
- **WHEN** the operator presses the right-arrow nudge shortcut once
- **THEN** that region moves by the configured single-step increment
- **AND** the preview reflects the nudge without requiring manual number entry
