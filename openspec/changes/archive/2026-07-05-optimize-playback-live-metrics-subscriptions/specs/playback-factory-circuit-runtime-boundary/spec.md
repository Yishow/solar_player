## MODIFIED Requirements

### Requirement: Factory Circuit separates circuits refresh from story refresh

The system SHALL keep circuits-source refresh, story-source refresh, and live-metric refresh on separate runtime boundaries so one source does not trigger unnecessary rebuilds of unrelated runtime or static state.

#### Scenario: Story refresh updates values without rebuilding the circuits source

- **WHEN** the story payload refreshes while the circuits source stays unchanged
- **THEN** the page updates only the story-dependent runtime values
- **AND** it keeps the existing circuits-derived runtime state intact until a circuits refresh actually succeeds

#### Scenario: Live metric update refreshes values without rebuilding the circuits source

- **WHEN** Factory Circuit receives a `liveMetrics:update` snapshot while its circuits source and story payload stay unchanged
- **THEN** the page updates only the live-metric-dependent KPI or load-value subtree
- **AND** it keeps the existing circuits-derived runtime state, static shell, and fallback lane intact until a circuits or story refresh actually changes them
