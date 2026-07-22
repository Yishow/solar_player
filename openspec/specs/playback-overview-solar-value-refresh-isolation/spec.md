# playback-overview-solar-value-refresh-isolation Specification

## Purpose

TBD - created by archiving change 'playback-overview-solar-value-refresh-isolation'. Update Purpose after archive.

## Requirements

### Requirement: Overview and Solar keep static subtree output stable during value-only refresh

The system SHALL keep static layout, hero media, ornament, connector, and card-shell output stable on Overview and Solar when only live values, story copy, or weather data refresh. Each page SHALL scope live metric subscriptions to the value-bearing subtree that actually reads those inputs, so unrelated metric updates SHALL NOT rebuild unaffected static or value subtrees.

#### Scenario: Overview updates runtime values without rebuilding static layout

- **WHEN** Overview receives new live metrics, story payload, or weather data while its config and media sources stay unchanged
- **THEN** the page updates only the value-bearing subtree that depends on the changed runtime inputs
- **AND** the static layout, hero media, and KPI shell output remain equivalent to the pre-refresh render

#### Scenario: Overview ignores unrelated metric updates

- **WHEN** Overview receives a `liveMetrics:update` snapshot whose changed fields are not read by the visible Overview runtime subtree
- **THEN** the page keeps the visible output equivalent to the pre-update render
- **AND** it does not rebuild the static layout or unrelated value subtree solely because the shared snapshot object changed

##### Example: unrelated metric update on Overview

| Changed metric | Visible Overview binding depends on it? | Expected visible result |
| -------------- | --------------------------------------- | ----------------------- |
| `phaseRVoltage` | yes | update the affected phase-power subtree |
| `factoryCircuitHeavyVehiclePower` | no | no visible Overview output change |

#### Scenario: Solar updates story values without rebuilding connectors

- **WHEN** Solar receives new live values or story payload while its config and icon sources stay unchanged
- **THEN** the page updates only the value-bearing subtree that depends on the changed runtime inputs
- **AND** the connector, flow-node geometry, and hero shell remain equivalent to the pre-refresh render

<!-- @trace
source: optimize-playback-live-metrics-subscriptions
updated: 2026-07-05
code:
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/web/src/hooks/useLiveMetrics.ts
tests:
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Overview/cardVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
-->

---
### Requirement: Overview and Solar runtime subscriptions consume shared playback metric contract keys

Overview and Solar value subtrees SHALL obtain their live-metric subscription key sets from the shared playback metric contract runtime key resolver. Those pages SHALL NOT maintain a separate authoritative hard-coded metric key array as the source of truth for which live metrics the value subtree reads. Value-only refresh isolation behavior remains required: static layout, hero, ornament, connector, and card-shell output SHALL stay stable when only live values change.

#### Scenario: Overview runtime keys match shared contract

- **WHEN** Overview builds its live-metrics selector subscription set
- **THEN** the subscribed key set equals the shared contract runtime keys for `overview`
- **AND** Overview does not define a parallel authoritative local metric-key truth list

#### Scenario: Solar runtime keys match shared contract

- **WHEN** Solar builds its live-metrics selector subscription set
- **THEN** the subscribed key set equals the shared contract runtime keys for `solar`
- **AND** Solar does not define a parallel authoritative local metric-key truth list

#### Scenario: Shared-backed keys preserve isolation on value-only updates

- **WHEN** Overview or Solar receives a live metrics update that changes only values for keys in the shared runtime subscription set
- **THEN** only the value-bearing subtree that depends on those keys updates
- **AND** static layout, hero media, ornament, connector, and card-shell output remain equivalent to the pre-refresh render

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