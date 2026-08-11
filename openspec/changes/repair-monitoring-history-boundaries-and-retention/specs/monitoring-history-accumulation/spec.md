## ADDED Requirements

### Requirement: Daily summary rollover excludes post-midnight increments from the previous day

The monitoring history pipeline SHALL close a completed local day using counters last attributable to that day and SHALL NOT use a later post-midnight counter snapshot to increase the completed day's totals.

#### Scenario: First poll after midnight includes new-day growth

- **GIVEN** the last processed counters before midnight belong to local date D
- **AND** the next processed counters on local date D+1 are higher
- **WHEN** the daily summary service detects the date rollover
- **THEN** the persisted summary for D SHALL be closed using the last counters attributable to D
- **AND** the increase first observed on D+1 SHALL NOT be added to D
- **AND** that increase SHALL contribute to the D+1 summary from its new-day baseline

#### Scenario: Service restarts across a day boundary

- **WHEN** the service restarts after local midnight with a completed prior-day summary and persisted cumulative counters
- **THEN** it SHALL initialize the new local day without rewriting post-midnight growth into the prior-day row
- **AND** same-day restart recovery SHALL continue to extend an existing current-day summary
