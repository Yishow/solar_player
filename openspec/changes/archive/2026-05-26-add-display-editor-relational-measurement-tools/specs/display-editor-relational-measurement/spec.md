## ADDED Requirements

### Requirement: Measure distances between any two editable regions

The system SHALL let operators inspect automatic distance rulers between any two editable regions that expose geometry in the display editor. The ruler output SHALL report design-space distances rather than raw viewport pixels.

#### Scenario: Operator compares two regions on the same page

- **WHEN** the operator requests a measurement between two editable regions on the same page
- **THEN** the editor shows the distance between those regions in design-space units
- **AND** the measurement remains aligned with the current zoom and pan state

##### Example: Overview copy and hero media report horizontal gap

- **GIVEN** the `Overview Hero Copy` region and the `Overview Hero Media` region both expose geometry
- **WHEN** the operator measures the relationship between them
- **THEN** the editor reports the horizontal gap using design-space coordinates
- **AND** the measurement does not depend on the current DOM pixel width of the viewport

### Requirement: Provide a temporary measurement mode that does not replace primary selection

The system SHALL provide a temporary measurement mode so operators can inspect region-to-region distances without replacing the current primary selection.

#### Scenario: Operator measures a second region while keeping the current selection

- **WHEN** the operator enters temporary measurement mode and targets another region
- **THEN** the editor shows the relational ruler between the current selection and that target region
- **AND** the original selected region remains selected for inspector and geometry editing

##### Example: Measuring a KPI card does not move inspector focus

- **GIVEN** the `Overview Hero Media` region is currently selected
- **WHEN** the operator enters temporary measurement mode and targets a KPI card
- **THEN** the relational ruler appears between those two regions
- **AND** the inspector stays focused on `Overview Hero Media`

### Requirement: Let measurement handles adjust the selected region geometry

The system SHALL let operators drag supported measurement handles to update the selected region geometry. The dragged handle SHALL mutate only the selected region, while the reference region remains fixed.

#### Scenario: Operator drags a measurement handle

- **WHEN** the operator drags a supported measurement handle from a relational ruler
- **THEN** the selected region geometry updates to match the new measured distance
- **AND** the reference region geometry remains unchanged

##### Example: Dragging the horizontal ruler moves the selected card closer

- **GIVEN** a selected KPI card is measured against a fixed neighboring KPI card
- **WHEN** the operator drags the horizontal measurement handle left by `12` design-space pixels
- **THEN** the selected KPI card moves left by `12` design-space pixels
- **AND** the neighboring KPI card stays in place

### Requirement: Keep measurement labels readable when the canvas is crowded

The system SHALL keep relational measurement labels readable by trying fallback placements or simplified presentation before giving up on the label.

#### Scenario: Primary label position is blocked

- **WHEN** the preferred label position overlaps page content or another higher-priority label
- **THEN** the editor moves the label to a fallback position or simplified style
- **AND** the operator still sees the measurement value

##### Example: Vertical ruler label moves outside a crowded card stack

- **GIVEN** the preferred label position for a vertical ruler overlaps two stacked cards
- **WHEN** the editor renders that ruler
- **THEN** the label moves to an alternate placement outside the blocked area
- **AND** the displayed distance remains visible
