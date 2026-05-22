## ADDED Requirements

### Requirement: Resolve the live metric keys a page requires

The system SHALL resolve, for each live-data display page, the set of underlying live metric keys it consumes from the display metric requirements. For an `mqtt-metric` requirement the underlying key SHALL be its requirement key; for a `derived-metric` requirement the underlying keys SHALL be its dependency keys, or its requirement key when no dependency keys are declared.

#### Scenario: Page metric keys derived from requirements

- **WHEN** the live metric keys for a page are resolved from the display metric requirements
- **THEN** the result SHALL include the requirement key of each `mqtt-metric` requirement for that page
- **AND** it SHALL include the dependency keys of each `derived-metric` requirement for that page

##### Example: solar page key resolution

- **GIVEN** the `solar` page has `mqtt-metric` requirements `realTimePower` and `todayGeneration`, and a `derived-metric` requirement `selfConsumptionRatio` with dependency keys `selfConsumptionRatio`, `selfConsumptionEnergy`, `consumptionEnergy`
- **WHEN** the live metric keys for `solar` are resolved
- **THEN** the result SHALL include `realTimePower`, `todayGeneration`, `selfConsumptionEnergy`, and `consumptionEnergy`

### Requirement: Evaluate page runtime freshness over the page's required metrics

The system SHALL evaluate runtime freshness for a page using only the live metrics that page requires. A page SHALL be fresh when every required metric that is present in the live snapshot has a timestamp within the freshness window. A page SHALL be stale when any present required metric is older than the freshness window, or when none of its required metrics are present in the snapshot. The evaluation SHALL report the oldest (stalest) present required metric key and timestamp for use in skip detail.

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

### Requirement: Rotation uses per-page freshness instead of the global latest timestamp

The display rotation evaluation SHALL determine each live-data page's stale-runtime condition from that page's own required-metric freshness, not from a single global latest timestamp across all metrics. A page SHALL NOT be treated as fresh solely because unrelated metrics updated recently.

#### Scenario: One page stale while another stays fresh under the same snapshot

- **GIVEN** two live-data pages require different metric sets and the live snapshot has page A's required metrics fresh but page B's required metric stale
- **WHEN** the rotation conditions are built for the current snapshot
- **THEN** page B SHALL be marked stale-runtime
- **AND** page A SHALL NOT be marked stale-runtime

#### Scenario: Stale page under hide policy is skipped with stale-runtime reason

- **GIVEN** a live-data page whose fallback policy for stale data is `hide`
- **WHEN** that page's required metrics are stale under per-page freshness
- **THEN** the page SHALL be skipped with skip reason `stale-runtime`

#### Scenario: Mock mode and freshness window source are preserved

- **WHEN** the MQTT status reason is `mock`
- **THEN** per-page freshness evaluation SHALL preserve the existing mock-mode behavior
- **AND** the freshness window SHALL continue to be sourced from the configured MQTT message timeout
