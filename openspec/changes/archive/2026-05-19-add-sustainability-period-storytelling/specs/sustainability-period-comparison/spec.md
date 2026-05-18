## ADDED Requirements

### Requirement: Model Sustainability metrics by period key

The system SHALL let `Sustainability` metrics resolve by period key so the page can switch among month, quarter, year, or lifetime views.

#### Scenario: Operator changes Sustainability period

- **WHEN** the selected Sustainability period changes
- **THEN** the big numbers and highlight values update to that period
- **AND** the page keeps a valid story even if some period fields are missing

##### Example: Switching from month to year updates the hero statistics

- **GIVEN** the page is currently showing monthly Sustainability values
- **WHEN** the selected period changes to `year`
- **THEN** the big numbers and highlight rail update to the yearly data set
- **AND** any missing yearly field falls back without breaking the page

### Requirement: Preserve period selection consistency across Sustainability story blocks

The system SHALL apply the selected period consistently across Sustainability story blocks that depend on periodized data.

#### Scenario: Highlight rail and summary use same period

- **WHEN** the page is viewing a given Sustainability period
- **THEN** all periodized story blocks use that same period context
- **AND** they do not silently mix data from different periods

##### Example: Quarter view does not mix with lifetime totals in periodized blocks

- **GIVEN** the page is set to the `quarter` period
- **WHEN** the highlight rail and summary values are resolved
- **THEN** both blocks use quarter data for their periodized fields
- **AND** they do not silently pull monthly values for one block and quarterly values for another
