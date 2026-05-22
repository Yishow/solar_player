## ADDED Requirements

### Requirement: Treat rail cards as first-class display editor authoring items

The system SHALL treat card rail cards as first-class authoring items in the display editor instead of exposing them only as an array payload inside a parent region.

#### Scenario: Operator selects a rail card from the editor

- **WHEN** the operator selects a card inside a supported card rail
- **THEN** the editor exposes that card as the current authoring item for canvas selection, inspector fields, and draft updates
- **AND** the operator does not need to edit the card only through a generic raw array row

##### Example: Sustainability household card becomes the selected authoring node

- **GIVEN** the Sustainability page has a rail card with the `household-equivalent` template
- **WHEN** the operator clicks that card on the canvas
- **THEN** the card becomes the selected authoring item
- **AND** the inspector loads that card's template-aware fields

### Requirement: Provide card lifecycle actions inside a rail

The system SHALL let the operator create, delete, duplicate, reorder, hide, and retarget rail cards from within the current draft session.

#### Scenario: Operator duplicates and reorders a rail card

- **WHEN** the operator duplicates an existing rail card and moves the copy earlier in the same rail
- **THEN** the draft stores a new card identity with the requested display order
- **AND** the resulting rail still remains part of the current draft session instead of creating a detached temporary preview item

##### Example: Duplicate a metric highlight card into the second slot

- **GIVEN** a card rail contains one `metric-highlight` summary card in slot `1`
- **WHEN** the operator duplicates that card and moves the duplicate to slot `2`
- **THEN** the draft contains two cards with distinct ids and ordered positions `1` and `2`
- **AND** preview renders both cards from the updated draft

### Requirement: Switch rail card templates through typed authoring controls

The system SHALL let the operator switch a rail card's template through typed authoring controls and then expose the correct field set for the selected template.

#### Scenario: Operator changes a card from metric highlight to household equivalent

- **WHEN** the operator changes a rail card template from `metric-highlight` to `household-equivalent`
- **THEN** the inspector swaps to the field set required by `household-equivalent`
- **AND** incompatible fields from the previous template do not keep masquerading as valid data for the new template
