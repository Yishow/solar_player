## MODIFIED Requirements

### Requirement: Evaluate page runtime freshness over the page's required metrics

The system SHALL evaluate runtime freshness for a page using only the live metrics that page requires. A page SHALL be fresh when every required metric that is present in the live snapshot has a timestamp within the freshness window. A page SHALL be stale when any present required metric is older than the freshness window, or when none of its required metrics are present in the snapshot. The evaluation SHALL report the oldest (stalest) present required metric key and timestamp for use in skip detail. The evaluation SHALL also report whether every required metric is present in the live snapshot (required-data presence), so callers can distinguish a page that has prior data but is stale from a page that has never received a required metric.

#### Scenario: Stale required metric makes the page stale

- **WHEN** at least one required metric present in the snapshot has a timestamp older than the freshness window
- **THEN** the page freshness evaluation SHALL report the page as stale
- **AND** it SHALL report that metric's key and timestamp as the stalest present required metric

##### Example: one stale required metric overrides unrelated fresh metrics

- **GIVEN** `solar` requires `realTimePower`, `todayGeneration`, and `systemEfficiency`
- **AND** the snapshot contains `realTimePower` at age 5000 ms, `todayGeneration` at age 10000 ms, and `systemEfficiency` at age 60000 ms
- **WHEN** the page freshness is evaluated with a 30000 ms freshness window
- **THEN** the page SHALL be reported as stale
- **AND** `systemEfficiency` SHALL be reported as the stalest present required metric

#### Scenario: No required metrics present makes the page stale

- **WHEN** none of the page's required metrics are present in the snapshot
- **THEN** the page freshness evaluation SHALL report the page as stale

##### Example: freshness over required metrics (window = 30000 ms, now = 2026-05-22T00:00:30.000Z)

| Required keys present (key@ageMs)            | Fresh? | Stalest key |
| -------------------------------------------- | ------ | ----------- |
| realTimePower@5000, todayGeneration@10000    | true   | (none)      |
| realTimePower@5000, todayGeneration@60000    | false  | todayGeneration |
| (none present)                               | false  | (none)      |

#### Scenario: All required metrics present but stale reports required-data present

- **WHEN** every required metric for the page is present in the snapshot and at least one is older than the freshness window
- **THEN** the page freshness evaluation SHALL report the page as stale
- **AND** it SHALL report required-data presence as true

#### Scenario: A missing required metric reports required-data absent

- **WHEN** at least one required metric for the page is absent from the snapshot
- **THEN** the page freshness evaluation SHALL report required-data presence as false
- **AND** it SHALL report the page as stale

### Requirement: Rotation uses per-page freshness instead of the global latest timestamp

The display rotation evaluation SHALL determine each live-data page's freshness from that page's own required-metric freshness, not from a single global latest timestamp across all metrics. A page SHALL NOT be treated as fresh solely because unrelated metrics updated recently. A live-data page whose required metrics are all present but stale (transient outage) SHALL remain in the playable pages and render last-known values. Rotation SHALL skip a live-data page for runtime-data reasons only when at least one of its required metrics has never been received; the `stale-runtime` skip reason SHALL be reserved for that never-had-data case.

#### Scenario: One page stale while another stays fresh under the same snapshot

- **GIVEN** two live-data pages require different metric sets and the live snapshot has page A's required metrics fresh but page B's required metric stale
- **WHEN** the rotation conditions are built for the current snapshot
- **THEN** page B SHALL be evaluated as stale under its own required metrics
- **AND** page A SHALL NOT be evaluated as stale

#### Scenario: Stale page with prior data stays playable during a broker outage

- **GIVEN** a live-data page whose fallback policy for stale data is `hide`
- **AND** every required metric for that page is present in the snapshot but at least one is older than the freshness window
- **WHEN** the rotation conditions are built for the current snapshot
- **THEN** the page SHALL remain in the playable pages
- **AND** the page SHALL NOT be skipped with skip reason `stale-runtime`

#### Scenario: Page that never received a required metric is skipped

- **GIVEN** a live-data page whose fallback policy for stale data is `hide`
- **AND** at least one required metric for that page is absent from the snapshot
- **WHEN** the rotation conditions are built for the current snapshot
- **THEN** the page SHALL be skipped with skip reason `stale-runtime`

#### Scenario: Mock mode and freshness window source are preserved

- **WHEN** the MQTT status reason is `mock`
- **THEN** per-page freshness evaluation SHALL preserve the existing mock-mode behavior
- **AND** the freshness window SHALL continue to be sourced from the configured MQTT message timeout
