## ADDED Requirements

### Requirement: Integrate stats and readiness sections into a layout panel

The system SHALL group the stats strip (`cs-stats`), the readiness summary text (`cs-readiness`), and the readiness findings list (`cs-readiness-list`) into a side-by-side layout container (`cs-summary-panel`).

#### Scenario: Readiness indicator and stats strip are rendered side-by-side

- **WHEN** the circuit settings card is rendered
- **THEN** the readiness section SHALL align to the left side of the summary panel
- **AND** the stats strip SHALL align to the right side of the summary panel
- **AND** the stats strip SHALL layout its items into three columns
- **AND** the left-side readiness container SHALL stretch its width to 100% to fill the remaining horizontal space and show rich hover feedback on findings items
