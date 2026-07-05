# display-runtime-render-invariance Specification

## Purpose

TBD - created by archiving change 'optimize-display-runtime-render-memoization'. Update Purpose after archive.

## Requirements

### Requirement: Render-output invariance under performance memoization

Performance optimizations applied to playback pages (Overview, Solar, FactoryCircuit) — including selector-scoped live metrics subscriptions, page-local static/live subtree boundaries, compatibility wrappers for full-snapshot consumers, and memoized shared display components — SHALL NOT change the render output. For an identical sequence of live-metrics socket snapshots, the post-optimization DOM structure, CSS class names, computed inline style values, text content, and card ordering SHALL be bit-equivalent to the pre-optimization output.

#### Scenario: Identical snapshot sequence produces identical render output

- **WHEN** a playback page receives the same ordered sequence of `liveMetrics:update` snapshots before and after the optimization
- **THEN** the rendered DOM structure, class names, inline style values, text content, and card order are identical between the two versions

#### Scenario: FHD witness shows no new visual difference

- **WHEN** an FHD witness capture (1920x1080) is taken for `/overview`, `/solar`, and `/factory-circuit` after the change
- **THEN** each capture compared against the corresponding reference in `docs/reference/FHD/` shows no new visual difference attributable to the selector-based optimization


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
### Requirement: Live data updates remain visible after memoization

Selector-based subscription isolation and memoization SHALL NOT cause stale rendering. When the underlying live-metrics data, weather data, story payload, or runtime config driving a visible playback subtree changes, the rendered output SHALL reflect the new data. Selector equality and memo boundaries SHALL include every runtime input needed to keep the selected subtree current.

#### Scenario: New snapshot value updates the displayed metric

- **WHEN** a `liveMetrics:update` snapshot delivers a changed value for a metric shown on a playback page
- **THEN** the corresponding card or value on the page updates to reflect the new value within the same render cycle as before the change

#### Scenario: Unrelated snapshot fields do not disturb unaffected output

- **WHEN** a `liveMetrics:update` snapshot changes only fields not read by a visible playback subtree
- **THEN** the unaffected subtree keeps the same rendered output
- **AND** no stale value appears in the subtree that does subscribe to changed runtime inputs

#### Scenario: Config change after hydration re-resolves the merged config

- **WHEN** the runtime resolved config for a playback page changes after initial hydration
- **THEN** the page recomputes the affected config-derived subtree and renders the updated config, even though per-second snapshot ticks alone do not trigger that recomputation


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
### Requirement: Existing visual-guardrail tests pass without modification

The change SHALL preserve existing visual-guardrail and runtime behavior coverage as the invariance gate. Existing output-level and behavior-level assertions SHALL pass without modification. An implementation-detail source assertion that directly encodes retired hook wiring SHALL be replaced only with an equal-or-stronger assertion of the new live-metrics subscription contract, and such a replacement SHALL NOT relax observable behavior coverage.

#### Scenario: Web test suite stays green with stable visual assertions

- **WHEN** `pnpm --filter @solar-display/web test` runs after the change
- **THEN** the suite passes
- **AND** no existing visual or observable-behavior assertion required weakening to accommodate the optimization

#### Scenario: Source-level contract assertion updates without relaxing behavior coverage

- **WHEN** an existing source-level assertion refers to retired `useLiveMetrics()` wiring details that no longer represent the optimized contract
- **THEN** the assertion is replaced with a new assertion of the selector-based subscription boundary or compatibility wrapper contract
- **AND** the replacement keeps the same or stronger verification of observable runtime behavior


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
### Requirement: Staged loading preserves playback hook order

Performance refactors that introduce or move staged loading returns in playback runtime pages SHALL preserve React hook call order. A playback runtime page that can return the shared display page loading state SHALL NOT call React hooks after that loading return path and before its main JSX return.

#### Scenario: Playback runtime loading guard covers all display routes

- **WHEN** the web test suite scans the runtime entry source for Overview, Solar, FactoryCircuit, Images, and Sustainability
- **THEN** every shared loading-state return path is verified to have no React hook calls between the loading return and the page main JSX return
- **AND** a violation identifies the affected playback page so the staged loading return can be moved after hook evaluation

##### Example: loading return region contains no hook calls

| Page | Source Region | Expected Result |
| ----- | ----- | ----- |
| `solar` | from `return <DisplayPageLoadingState />;` to the page main `return (` | no `useMemo`, `useEffect`, `useState`, or other React hook call appears in the region |
| `sustainability` | from `return <DisplayPageLoadingState />;` to the page main `return (` | no `useMemo`, `useEffect`, `useState`, or other React hook call appears in the region |

<!-- @trace
source: harden-performance-regression-guards
updated: 2026-06-14
code:
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
tests:
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
-->