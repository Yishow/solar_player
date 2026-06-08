## ADDED Requirements

### Requirement: Author Overview KPI Card Footer Types

The system SHALL allow an operator to configure the footer layout type (`footerType`) for each of the five Overview KPI cards. The supported footer types SHALL include: `sparkline` (area trend line), `progress` (completion bar), `text` (custom information string), `co2-tree` (ecological planting equivalent), and `none` (no footer). The schema SHALL support custom properties `footerText` (string) for `text` footers and `targetValue` (number) for `progress` footers.

#### Scenario: Operator configures progress footer

- **WHEN** an operator selects `progress` as the footer type for the today generation card and sets `targetValue` to `5000`
- **THEN** the today generation card renders a progress bar reflecting the current reading relative to 5000 kWh

#### Scenario: Missing configuration falls back to seed default

- **WHEN** the persisted page configuration lacks a `footerType` attribute for a card
- **THEN** the system SHALL fallback to the predefined seed footer configuration (e.g., progress for today, text for total, co2-tree for CO2 cards)
