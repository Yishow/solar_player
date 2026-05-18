## ADDED Requirements

### Requirement: Reuse layout adjustments within an editor session

The system SHALL let operators reuse layout adjustments by resetting to seed values or copying and pasting geometry between compatible regions.

#### Scenario: Operator pastes geometry into another region

- **WHEN** an operator copies geometry from one compatible region and pastes it into another
- **THEN** the destination region adopts that geometry
- **AND** the change remains part of the editable draft session

##### Example: Operator copies one KPI card geometry to another

- **GIVEN** two `Overview` KPI regions are marked as geometry-compatible
- **WHEN** the operator copies the geometry from one KPI region and pastes it into the other
- **THEN** the destination KPI adopts the copied rectangle
- **AND** the updated geometry remains part of the current unsaved draft

### Requirement: Persist editor history per page session

The system SHALL provide undo and redo for layout changes within the current page session before the draft is saved.

#### Scenario: Operator undoes a geometry change

- **WHEN** the operator triggers undo after a layout change in the current page session
- **THEN** the most recent unsaved canvas change is reverted
- **AND** redo can restore it until the history branch changes

##### Example: Undo restores the previous Factory Circuit load row rectangle

- **GIVEN** the operator has just resized a `Factory Circuit` load row
- **WHEN** the operator triggers undo
- **THEN** the row geometry returns to the previous unsaved rectangle
- **AND** redo can reapply the resize until a different edit is made
