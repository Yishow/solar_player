## ADDED Requirements

### Requirement: Data authoring is a first-class editor capability

The Display Page Editor foundation SHALL support data-binding authoring as a shared inspector capability for eligible items. Page implementations MUST NOT add hidden page-local configuration controls or runtime constants as the only way to choose a widget's metric.

#### Scenario: A new value-bearing widget family is added
- **WHEN** a page registers a new value-bearing widget family as data-bindable
- **THEN** the shared editor can expose its Data inspector fields from the registered capability/schema
- **AND** the page does not need a separate hardcoded settings screen solely to bind a metric

#### Scenario: A widget is not data-bindable
- **WHEN** the selected editor item has no runtime data capability
- **THEN** the editor does not expose metric-binding controls for that item
- **AND** existing visual/content editing remains available according to its registered capabilities
