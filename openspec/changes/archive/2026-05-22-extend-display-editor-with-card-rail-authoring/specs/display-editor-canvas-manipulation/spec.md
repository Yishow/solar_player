## MODIFIED Requirements

### Requirement: Manipulate display editor geometry directly on canvas

The system SHALL let operators manipulate editable region geometry directly on the display editor canvas. When a page contains a supported card rail, the same canvas workflow SHALL also support dragging and resizing individual rail cards within that rail.

#### Scenario: Operator drags or resizes a region

- **WHEN** the operator drags or resizes an editable region on the canvas
- **THEN** the draft geometry updates to match that interaction
- **AND** the preview reflects the geometry change immediately

##### Example: Operator drags Overview hero copy to the right

- **GIVEN** the `Overview Hero Copy` region is selected in the editor
- **WHEN** the operator drags that region `24` pixels to the right
- **THEN** the draft `left` value updates by `24`
- **AND** the preview immediately shows the hero copy in the new position

#### Scenario: Operator drags a rail card within its parent rail

- **WHEN** the operator drags or resizes a supported rail card on the canvas
- **THEN** the draft updates that card's frame
- **AND** the resulting frame remains constrained to the parent rail bounds

##### Example: Household-equivalent card is clamped inside the Sustainability rail

- **GIVEN** a Sustainability card rail is `470` pixels wide
- **WHEN** the operator drags a household-equivalent card toward the right edge beyond the remaining space
- **THEN** the saved card frame stops at the rail boundary
- **AND** the preview shows the clamped card instead of allowing overflow beyond the rail
