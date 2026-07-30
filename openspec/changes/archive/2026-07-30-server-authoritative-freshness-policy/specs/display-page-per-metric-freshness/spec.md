## ADDED Requirements

### Requirement: Resolve per-metric freshness through the global category Policy

Each required display metric SHALL map to one Freshness Policy category. Page freshness SHALL aggregate the Server-authoritative states of its required metrics and SHALL NOT apply an independent Client threshold.

#### Scenario: Required metrics have mixed states

- **WHEN** a page requires one live realtime metric and one stale daily metric
- **THEN** the page freshness reports stale with the stale metric and sourceTimestamp
- **AND** unrelated metrics do not alter the result
