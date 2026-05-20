## ADDED Requirements

### Requirement: Treat year as a distinct Energy History range

The system SHALL treat `year` as a distinct `Energy History` range instead of aliasing it to `total`.

#### Scenario: Operator opens the year tab

- **WHEN** the operator selects the `year` tab in `Energy History`
- **THEN** the page SHALL request and render data for the current calendar year only
- **AND** it SHALL NOT relabel cumulative data as if it were annual data

##### Example: Year and total remain different periods

| Range | Snapshot period | Summary period | Counter semantics |
| ----- | --------------- | -------------- | ----------------- |
| `year` | current calendar year | current calendar year | not treated as total-only source |
| `total` | full retained history | full retained history | cumulative counters allowed |

### Requirement: Keep Energy History summaries consistent with the selected range

The system SHALL keep `Energy History` summary cards, table rows, and chart labels consistent with the selected period contract.

#### Scenario: Annual summary stays aligned with annual chart data

- **WHEN** `Energy History` renders the `year` range
- **THEN** the summary cards and table rows SHALL describe the same annual period shown by the chart data
- **AND** the page SHALL NOT mix annual labels with cumulative totals in the same range state

##### Example: Year summary does not reuse total counters

- **GIVEN** the cumulative counters include multiple years of retained data
- **WHEN** the operator views the `year` range
- **THEN** the page uses the current year's summaries and snapshots for annual labels
- **AND** cumulative-only counters remain reserved for the `total` range
