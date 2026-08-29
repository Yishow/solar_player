# playback-metric-contract Specification

## Purpose

TBD - created by archiving change 'playback-metric-contract-single-source'. Update Purpose after archive.

## Requirements

### Requirement: Shared package owns Overview and Solar playback metric contract

The system SHALL define a single shared playback metric contract for the `overview` and `solar` pages that is the authoritative source for (1) gate requirements used by readiness and freshness, (2) runtime live-metric subscription keys used by each page value subtree, and (3) display `sourceClass` metadata for each bound KPI metricKey. Page modules and server story builders SHALL consume this contract instead of maintaining a parallel authoritative metric-key list for those pages.

#### Scenario: Contract exposes three layers for Overview

- **WHEN** a caller resolves the playback metric contract for page key `overview`
- **THEN** the contract includes gate requirements drawn from the shared display metric requirements for `overview`
- **AND** the contract includes a runtime subscription key list for Overview value rendering
- **AND** the contract includes display sourceClass metadata for Overview KPI metric keys

#### Scenario: Contract exposes three layers for Solar

- **WHEN** a caller resolves the playback metric contract for page key `solar`
- **THEN** the contract includes gate requirements drawn from the shared display metric requirements for `solar`
- **AND** the contract includes a runtime subscription key list for Solar value rendering
- **AND** the contract includes display sourceClass metadata for Solar KPI metric keys

##### Example: Solar layers are distinct but related

- **GIVEN** Solar gate requirements include `selfConsumptionRatio` as a derived metric with dependency keys
- **WHEN** the contract is resolved for `solar`
- **THEN** gate requirements still describe `selfConsumptionRatio` and its dependencies
- **AND** runtime subscription keys include every live key the Solar client value subtree actually reads
- **AND** display sourceClass for `selfConsumptionRatio` is `derived-metric`

<!-- @trace
source: playback-metric-contract-single-source
updated: 2026-07-23
code:
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/playbackMetricContract.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
-->

---

### Requirement: Derived and aggregate metrics MUST NOT be labeled mqtt-live

For Overview and Solar display bindings covered by the playback metric contract, the system SHALL assign `sourceClass` values that match the real resolution path. Metrics that are derived, aggregated from factory summaries, or cumulative counters SHALL NOT use `sourceClass` `mqtt-live`.

#### Scenario: todayGeneration is not mqtt-live

- **WHEN** Overview or Solar resolves display metadata for metric key `todayGeneration`
- **THEN** the sourceClass is `derived-metric`
- **AND** the sourceClass is not `mqtt-live`

#### Scenario: todayCo2Reduction is not mqtt-live

- **WHEN** Overview or Solar resolves display metadata for metric key `todayCo2Reduction`
- **THEN** the sourceClass is `derived-metric`
- **AND** the sourceClass is not `mqtt-live`

#### Scenario: Direct MQTT metrics remain mqtt-live

- **WHEN** Overview or Solar resolves display metadata for metric key `realTimePower` or Solar resolves `systemEfficiency`
- **THEN** the sourceClass is `mqtt-live`

##### Example: Overview KPI sourceClass map

| metricKey | sourceClass |
| --------- | ----------- |
| realTimePower | mqtt-live |
| todayGeneration | derived-metric |
| totalGeneration | cumulative-counter |
| todayCo2Reduction | derived-metric |
| totalCo2Reduction | cumulative-counter |

##### Example: Solar KPI sourceClass map

| metricKey | sourceClass |
| --------- | ----------- |
| realTimePower | mqtt-live |
| todayGeneration | derived-metric |
| selfConsumptionRatio | derived-metric |
| todayCo2Reduction | derived-metric |
| totalCo2Reduction | cumulative-counter |
| systemEfficiency | mqtt-live |

<!-- @trace
source: playback-metric-contract-single-source
updated: 2026-07-23
code:
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/playbackMetricContract.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
-->

---

### Requirement: Runtime subscription keys are exported for Overview and Solar consumers

The shared package SHALL export a stable resolver for Overview and Solar runtime subscription metric keys. Unknown page keys SHALL yield an empty key list without throwing.

#### Scenario: Overview runtime keys cover KPI and phase bindings

- **WHEN** the runtime key resolver is called with `overview`
- **THEN** the result includes `realTimePower`, `todayGeneration`, `totalGeneration`, `todayCo2Reduction`, and `totalCo2Reduction`
- **AND** the result includes the Overview phase metric keys required by the Overview value subtree (`phaseRCurrent`, `phaseRPower`, `phaseRVoltage`, `phaseSCurrent`, `phaseSPower`, `phaseSVoltage`, `phaseTCurrent`, `phaseTPower`, `phaseTVoltage`)

#### Scenario: Solar runtime keys cover Solar value subtree reads

- **WHEN** the runtime key resolver is called with `solar`
- **THEN** the result includes `realTimePower`, `systemEfficiency`, `selfConsumptionRatio`, `todayGeneration`, `todayCo2Reduction`, and `totalCo2Reduction`
- **AND** if the Solar client value path reads `selfConsumptionEnergy` or `consumptionEnergy` from the live snapshot, those keys are included
- **AND** if the Solar client value path never reads those energy keys, the contract documents them as server-only dependencies and the runtime list omits them

#### Scenario: Unknown page key is empty and safe

- **WHEN** the runtime key resolver is called with a page key that is not `overview` or `solar` under this contract scope
- **THEN** the resolver returns an empty list
- **AND** the resolver does not throw

<!-- @trace
source: playback-metric-contract-single-source
updated: 2026-07-23
code:
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/playbackMetricContract.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
-->

---

### Requirement: Materialized upstream dependencies remain explicit in the contract

When Overview or Solar gate requirements depend on upstream factory generation keys that the server materializes into canonical live metrics before browser consumption, the shared contract SHALL still expose those upstream dependency keys on the gate requirement layer even when the runtime subscription layer only lists the canonical materialized keys.

#### Scenario: todayGeneration gate keeps factory generation dependencies

- **WHEN** the gate requirement layer is resolved for Overview or Solar `todayGeneration`
- **THEN** dependency keys include the factory generation summary keys used to derive canonical generation
- **AND** the runtime subscription layer SHALL list only `todayGeneration` for that KPI when the browser reads only the materialized canonical metric

##### Example: Gate vs runtime for todayGeneration

- **GIVEN** server aggregate materializes CL and KN summaries into `todayGeneration`
- **WHEN** Overview runtime subscribes for value rendering
- **THEN** runtime keys include `todayGeneration`
- **AND** gate requirements for `todayGeneration` still list factory generation dependency keys for readiness evaluation

<!-- @trace
source: playback-metric-contract-single-source
updated: 2026-07-23
code:
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/playbackMetricContract.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
-->

### Requirement: Playback metric keys are semantic and site-independent

The shared playback metric contract SHALL describe semantic metric keys independently from factory identity. CL and KN versions of the same measurement SHALL use the same semantic `metricKey` and SHALL be distinguished by resolved metric scope instead of site names embedded in the key.

#### Scenario: Same KPI is rendered at both sites
- **WHEN** Overview at CL and Overview at KN both render real-time power
- **THEN** both page contracts use the semantic metric key `realTimePower`
- **AND** runtime resolution distinguishes the readings by `cl` and `kn` scope

#### Scenario: Factory Circuit slot exists at both sites
- **WHEN** CL and KN both expose a stamping power slot
- **THEN** the shared metric vocabulary uses one stamping semantic metric key for that measurement family
- **AND** the contract SHALL NOT require a `guanyin`, `jungli`, `cl`, or `kn` suffix inside that semantic key to prevent collisions

### Requirement: Runtime subscription contracts carry semantic keys, not raw topics

Runtime subscription key lists SHALL remain lists of semantic metric keys. MQTT topic selection and site routing SHALL occur upstream of the playback contract.

#### Scenario: MQTT topic changes without a page contract change
- **WHEN** the MQTT topic that supplies a semantic metric is changed while the metric identity and meaning remain the same
- **THEN** the playback metric contract remains unchanged
- **AND** playback consumers continue to subscribe by semantic metric key
