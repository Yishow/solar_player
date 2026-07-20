## MODIFIED Requirements

### Requirement: Model Sustainability metrics by period key

The system SHALL resolve Sustainability period-based metrics and comparisons from declared runtime or rollup inputs instead of fixed presentation-only placeholder growth values.

#### Scenario: Year-over-year comparison input is unavailable

- **WHEN** the selected period lacks the data required to compute a comparison delta
- **THEN** the page reports that the comparison is unavailable or degraded
- **AND** it does not display an unqualified static percentage as though it were computed live

##### Example: Year view lacks comparison baseline

- **GIVEN** the `year` period has aggregate totals but no previous-year baseline
- **WHEN** the page switches from `quarter` to `year`
- **THEN** the comparison area reports that the year-over-year delta is unavailable
- **AND** the page does not keep showing a fixed `2.1%` growth value
