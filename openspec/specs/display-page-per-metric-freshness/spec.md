# display-page-per-metric-freshness Specification

## Purpose

TBD - created by archiving change 'refine-rotation-per-metric-freshness'. Update Purpose after archive.

## Requirements

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


<!-- @trace
source: refine-rotation-per-metric-freshness
updated: 2026-05-23
code:
  - apps/web/src/services/socket.ts
  - apps/server/package.json
  - packages/shared/src/displayStory.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/main.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Solar/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/tsconfig.json
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/config.ts
  - apps/web/src/recovery/crashRecovery.ts
  - packages/shared/src/index.ts
  - AGENTS.md
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/package.json
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/app/router.tsx
  - apps/web/index.html
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/server/src/services/displayStoryService.ts
  - .env.example
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/pages/Images/index.tsx
tests:
  - apps/server/src/routes/device.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
-->

---
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


<!-- @trace
source: playback-broker-failure-resilience
updated: 2026-06-09
code:
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/components/displayPageCards.tsx
  - packages/shared/src/weather.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/styles/global.css
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/hooks/displaySyncPlaybackReload.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.test.ts
  - apps/web/src/hooks/displaySyncPlaybackReload.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - packages/shared/src/imagePlaylist.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
-->

---
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

<!-- @trace
source: playback-broker-failure-resilience
updated: 2026-06-09
code:
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/components/displayPageCards.tsx
  - packages/shared/src/weather.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/styles/global.css
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/hooks/displaySyncPlaybackReload.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.test.ts
  - apps/web/src/hooks/displaySyncPlaybackReload.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - packages/shared/src/imagePlaylist.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
-->