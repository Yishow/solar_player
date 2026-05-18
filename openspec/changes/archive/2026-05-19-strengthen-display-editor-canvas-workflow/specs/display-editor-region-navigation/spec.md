## ADDED Requirements

### Requirement: Keep region navigation separate from visual overlay

The system SHALL provide region navigation separate from the visual overlay so operators can locate, select, and lock regions even when the canvas is crowded.

#### Scenario: Operator selects region from navigation tree

- **WHEN** the operator selects a region from the navigation tree
- **THEN** the corresponding canvas region becomes selected
- **AND** the inspector follows that selected region

##### Example: Navigation tree selects the Sustainability highlight rail

- **GIVEN** the navigation tree lists `Sustainability Highlight Rail`
- **WHEN** the operator clicks that tree item
- **THEN** the highlight rail region becomes selected on the canvas
- **AND** the inspector switches to that region's fields

### Requirement: Support locked regions in display editor navigation

The system SHALL support locked regions that stay visible but cannot be manipulated until unlocked.

#### Scenario: Locked region blocks accidental manipulation

- **WHEN** a region is locked in navigation
- **THEN** the canvas keeps showing that region
- **AND** direct manipulation is prevented until the region is unlocked

##### Example: Locked hero media cannot be dragged

- **GIVEN** the operator locks a hero media region from the navigation tree
- **WHEN** the operator tries to drag that region on the canvas
- **THEN** the region remains visible but does not move
- **AND** dragging becomes available again only after the region is unlocked
