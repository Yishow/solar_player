## ADDED Requirements

### Requirement: Overview and Solar monitoring bindings keep sourceClass consistent with readiness semantics

For Overview and Solar metrics that participate in both the shared monitoring story model and display readiness gate requirements, the system SHALL keep display `sourceClass` consistent with the metric resolution path used for readiness. A metric classified as derived for readiness SHALL NOT be presented in monitoring story bindings as `mqtt-live`.

#### Scenario: Solar story bindings align derived metrics

- **WHEN** the shared display-story builder emits Solar KPI bindings
- **THEN** `selfConsumptionRatio` uses sourceClass `derived-metric`
- **AND** `todayGeneration` and `todayCo2Reduction` use sourceClass `derived-metric`
- **AND** `realTimePower` and `systemEfficiency` use sourceClass `mqtt-live`

#### Scenario: Monitoring tooltip source composition remains honest

- **WHEN** a playback tooltip describes source composition for an Overview or Solar derived metric card
- **THEN** the exposed sourceClass matches the shared playback metric contract
- **AND** dependency keys for derived metrics remain available for inspection

##### Example: Solar binding sourceClass alignment

| metricKey | sourceClass |
| --------- | ----------- |
| realTimePower | mqtt-live |
| todayGeneration | derived-metric |
| selfConsumptionRatio | derived-metric |
| todayCo2Reduction | derived-metric |
| totalCo2Reduction | cumulative-counter |
| systemEfficiency | mqtt-live |
