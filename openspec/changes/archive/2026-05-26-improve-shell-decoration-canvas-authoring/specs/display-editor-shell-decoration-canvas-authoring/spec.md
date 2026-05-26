## ADDED Requirements

### Requirement: Shell decoration canvas supports direct object selection and manipulation

The system SHALL let operators select, drag, and resize Shared Shell Decoration objects directly on the shell authoring canvas. Canvas manipulation SHALL update the selected object's shell decoration draft frame without requiring raw JSON edits.

#### Scenario: Operator drags a header ornament on the canvas

- **WHEN** the operator selects a header-mounted shell decoration object on the canvas and drags it
- **THEN** the object's draft frame updates in header-local coordinates
- **AND** the object list and inspector show the same selected object
- **AND** the object remains constrained to the header band

##### Example: Header line stays inside header bounds

- **GIVEN** a header line object is selected
- **WHEN** the operator drags it below the header band
- **THEN** the saved draft frame is clamped within the header band
- **AND** the canvas preview shows the clamped position

### Requirement: Shell decoration canvas exposes band guides and live measurements

The system SHALL render header/footer band guides and live selected-object measurements in the shell decoration canvas. These guides SHALL use the same design-space coordinate mapping as the display editor preview and SHALL remain passive to shell object interactions.

#### Scenario: Operator resizes a footer decoration

- **WHEN** the operator resizes a footer-mounted shell decoration object
- **THEN** the canvas shows the object's width, height, and distances to footer band bounds
- **AND** header/footer boundary guides remain visible
- **AND** the guide layer does not block pointer interaction

##### Example: Footer ornament reports distances to footer band

- **GIVEN** a footer ornament object is selected at `left=120`, `top=12`, `width=80`, and `height=32`
- **WHEN** the operator resizes its width to `140`
- **THEN** the measurement overlay reports `140` as the object width
- **AND** left, right, top, and bottom distances are measured against the footer band bounds
