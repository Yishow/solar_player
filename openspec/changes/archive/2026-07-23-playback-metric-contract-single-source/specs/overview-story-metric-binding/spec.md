## ADDED Requirements

### Requirement: Overview story and fallback bindings use contract-aligned sourceClass values

Overview KPI bindings produced by the shared display-story path and by page fallback view-model bindings SHALL use `sourceClass` values from the shared playback metric contract. Overview SHALL NOT label `todayGeneration` or `todayCo2Reduction` as `mqtt-live`.

#### Scenario: Shared story Overview metrics align sourceClass

- **WHEN** `/api/display-story` builds the Overview metrics payload
- **THEN** each Overview KPI metricKey carries a sourceClass equal to the shared playback metric contract value for that metricKey
- **AND** `todayGeneration` and `todayCo2Reduction` are not `mqtt-live`

#### Scenario: Overview fallback bindings align when story is absent

- **WHEN** Overview renders KPI cards using page fallback bindings because shared story metrics are unavailable
- **THEN** fallback bindings for contract-covered metricKeys use the same sourceClass values as the shared playback metric contract
- **AND** readiness coverage for those KPI metricKeys remains declarable from the shared gate requirements

##### Example: Overview sourceClass alignment

| metricKey | sourceClass |
| --------- | ----------- |
| realTimePower | mqtt-live |
| todayGeneration | derived-metric |
| totalGeneration | cumulative-counter |
| todayCo2Reduction | derived-metric |
| totalCo2Reduction | cumulative-counter |
