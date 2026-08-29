## ADDED Requirements

### Requirement: Per-metric freshness is evaluated on scoped metric identity

Freshness evaluation for a playback page SHALL use the resolved `(metricScope, metricKey)` identity for each underlying live metric. A healthy reading from another site MUST NOT satisfy or refresh a stale dependency for the current site.

#### Scenario: CL metric is stale while KN is fresh
- **WHEN** a CL page requires `realTimePower`, the CL reading is stale, and the KN reading with the same semantic metric key is fresh
- **THEN** the CL requirement remains stale
- **AND** the KN timestamp SHALL NOT refresh the CL freshness result

#### Scenario: Page uses an explicit global dependency
- **WHEN** a page requirement explicitly resolves a dependency under `global`
- **THEN** freshness is evaluated against the global reading for that dependency
- **AND** the result remains labeled with `metricScope = global`
