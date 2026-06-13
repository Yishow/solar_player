# display-runtime-render-invariance Specification

## Purpose

TBD - created by archiving change 'optimize-display-runtime-render-memoization'. Update Purpose after archive.

## Requirements

### Requirement: Render-output invariance under performance memoization

Performance optimizations applied to playback pages (Overview, Solar, FactoryCircuit) — including `useMemo` wrapping of viewModel construction and config merge, prop-reference stabilization, and `React.memo` on shared display components — SHALL NOT change the render output. For an identical sequence of live-metrics socket snapshots, the post-optimization DOM structure, CSS class names, computed inline style values, text content, and card ordering SHALL be bit-equivalent to the pre-optimization output.

#### Scenario: Identical snapshot sequence produces identical render output

- **WHEN** a playback page receives the same ordered sequence of `liveMetrics:update` snapshots before and after the memoization change
- **THEN** the rendered DOM structure, class names, inline style values, text content, and card order are identical between the two versions

#### Scenario: FHD witness shows no new visual difference

- **WHEN** an FHD witness capture (1920x1080) is taken for `/overview`, `/solar`, and `/factory-circuit` after the change
- **THEN** each capture compared against the corresponding reference in `docs/reference/FHD/` shows no new visual difference attributable to the memoization change


<!-- @trace
source: optimize-display-runtime-render-memoization
updated: 2026-06-09
code:
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/styles/management.css
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/services/socket.ts
tests:
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
-->

---
### Requirement: Live data updates remain visible after memoization

Memoization SHALL NOT cause stale rendering. When the underlying live-metrics data driving a memoized viewModel or display component changes, the rendered output SHALL reflect the new data. Memo dependency lists SHALL include every input the memoized computation reads.

#### Scenario: New snapshot value updates the displayed metric

- **WHEN** a `liveMetrics:update` snapshot delivers a changed value for a metric shown on a playback page
- **THEN** the corresponding card or value on the page updates to reflect the new value within the same render cycle as before the change

#### Scenario: Config change after hydration re-resolves the merged config

- **WHEN** the runtime resolved config for a playback page changes after initial hydration
- **THEN** the memoized merged config recomputes and the page renders the updated config, even though per-second snapshot ticks alone do not trigger that recomputation

##### Example: snapshot ticks do not recompute config, config change does

| Event                                  | Config useMemo recomputes? | Rendered config |
| -------------------------------------- | -------------------------- | --------------- |
| Initial hydration sets resolved config | yes (first compute)        | config v1       |
| `liveMetrics:update` snapshot tick     | no                         | config v1       |
| Runtime resolved config changes to v2  | yes                        | config v2       |


<!-- @trace
source: optimize-display-runtime-render-memoization
updated: 2026-06-09
code:
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/styles/management.css
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/services/socket.ts
tests:
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
-->

---
### Requirement: Existing visual-guardrail tests pass without modification

The change SHALL preserve existing web test coverage as the invariance gate. Existing playback-page and visual-guardrail tests SHALL pass without modification. A required modification to an existing visual or behavioral assertion SHALL be treated as a signal of an unintended render change and SHALL halt the change for review.

#### Scenario: Web test suite stays green without editing assertions

- **WHEN** `pnpm --filter @solar-display/web test` runs after the change
- **THEN** the suite passes and no existing visual or behavioral assertion required editing to make it pass

<!-- @trace
source: optimize-display-runtime-render-memoization
updated: 2026-06-09
code:
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/styles/management.css
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/services/socket.ts
tests:
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
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