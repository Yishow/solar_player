## MODIFIED Requirements

### Requirement: Keep region navigation separate from visual overlay

The system SHALL provide region navigation separate from the visual overlay so operators can locate, select, and lock regions even when the canvas is crowded. When a page contains a card rail, the navigation tree SHALL also expose the rail's child cards as selectable items.

#### Scenario: Operator selects region from navigation tree

- **WHEN** the operator selects a region from the navigation tree
- **THEN** the corresponding canvas region becomes selected
- **AND** the inspector follows that selected region

##### Example: Navigation tree selects the Sustainability highlight rail

- **GIVEN** the navigation tree lists `Sustainability Highlight Rail`
- **WHEN** the operator clicks that tree item
- **THEN** the highlight rail region becomes selected on the canvas
- **AND** the inspector switches to that region's fields

#### Scenario: Navigation tree selects an individual rail card

- **WHEN** the navigation tree lists child cards under a supported card rail
- **AND** the operator selects one of those child cards
- **THEN** the corresponding rail card becomes selected on the canvas
- **AND** the inspector switches to that card's template-aware fields instead of the parent rail container

##### Example: Navigation tree selects the cumulative household card

- **GIVEN** the Sustainability card rail contains a `cumulative` household-equivalent card
- **WHEN** the operator clicks that card from the navigation tree
- **THEN** the cumulative card becomes the selected authoring item
- **AND** the inspector shows the cumulative card fields
