# overview-trend-data-integrity Specification

## Purpose

TBD - created by archiving change 'replace-overview-sparkline-mock-with-runtime-data'. Update Purpose after archive.

## Requirements

### Requirement: Overview KPI trend renders only from runtime data

The Overview KPI cards SHALL render a trend sparkline only from runtime-provided trend data exposed by the view model. The cards SHALL NOT render trend data sourced from mock fixtures.

#### Scenario: Runtime trend series renders a sparkline

- **WHEN** the view model provides a non-empty `trendSeries` for a KPI metric
- **THEN** that KPI card SHALL render a sparkline using the runtime `trendSeries`

#### Scenario: Mock trend data is not used

- **WHEN** the Overview page renders
- **THEN** it SHALL NOT import or render the mock `trendSeries` fixture for KPI sparklines


<!-- @trace
source: replace-overview-sparkline-mock-with-runtime-data
updated: 2026-05-23
code:
  - apps/server/package.json
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/server-startup.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/main.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/web/index.html
  - apps/web/src/pages/Overview/index.tsx
  - .env.example
  - apps/server/src/routes/display-story.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/displayStory.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/server/src/config.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - AGENTS.md
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/tsconfig.json
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/services/socket.ts
  - packages/shared/src/index.ts
tests:
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/recovery/installCrashRecovery.test.ts
-->

---
### Requirement: Missing runtime trend hides the sparkline

When the view model does not provide a trend series for a KPI metric, the Overview card SHALL omit the sparkline rather than display fabricated data.

#### Scenario: No runtime trend omits the sparkline

- **WHEN** a KPI metric has no `trendSeries` (undefined or empty)
- **THEN** the Overview card SHALL NOT render a sparkline for that metric

<!-- @trace
source: replace-overview-sparkline-mock-with-runtime-data
updated: 2026-05-23
code:
  - apps/server/package.json
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/server-startup.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/main.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/web/index.html
  - apps/web/src/pages/Overview/index.tsx
  - .env.example
  - apps/server/src/routes/display-story.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/displayStory.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/server/src/config.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - AGENTS.md
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/tsconfig.json
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/services/socket.ts
  - packages/shared/src/index.ts
tests:
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/recovery/installCrashRecovery.test.ts
-->

---
### Requirement: Overview generation trend reflects instantaneous generation power

The Overview generation trend series SHALL represent instantaneous generation power (the time-series of generation power readings), not cumulative generation energy, so the chart forms a daily solar profile (rising after sunrise, peaking around midday, falling toward sunset). The server SHALL persist instantaneous generation power into the metric snapshot history, and the Overview trend reader SHALL source the series from that instantaneous-power history. When instantaneous-power history is absent, the reader SHALL fall back to the existing stored series rather than failing.

#### Scenario: Trend series uses instantaneous generation power

- **WHEN** the server has recorded instantaneous generation power snapshots over a day
- **THEN** the Overview generation trend series reflects those instantaneous-power readings as a daily profile rather than a monotonically increasing cumulative total

##### Example: Noon peak comes from instantaneous power history

- **GIVEN** `metric_snapshots.generation_power` for one day reads `0.0, 0.4, 1.7, 3.9, 5.1, 3.2, 1.0, 0.0`
- **WHEN** `readOverviewGenerationTrendSeries` loads the latest 24 samples
- **THEN** the returned trend rises toward midday and falls afterward
- **AND** it does not render as a monotonically increasing cumulative curve

#### Scenario: Reader falls back when instantaneous-power history is absent

- **WHEN** no instantaneous generation power history is available
- **THEN** the Overview generation trend reader returns the previously stored series without raising an error

##### Example: Legacy history still renders a trend

- **GIVEN** the history table has legacy `generation` values but `generation_power` is null for all sampled rows
- **WHEN** the Overview trend reader resolves the series
- **THEN** it returns the legacy `generation` series
- **AND** the widget continues rendering a chart instead of failing


<!-- @trace
source: align-overview-cards-to-better-reference
updated: 2026-06-10
code:
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/routes/image-playlist.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/metrics/solarGenerationProfile.ts
  - apps/web/src/services/api.ts
  - apps/server/src/services/generationTrendSeries.ts
  - docs/reference-match/settings-images-layout-refactor-plan.md
  - apps/web/src/hooks/useImagesAutoplay.ts
  - .env.example
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.ts
  - apps/web/vite.config.ts
  - apps/server/src/server-startup.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/styles/management.css
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/services/runtimeOrigin.ts
  - apps/web/src/pages/Overview/widgets/generationTrendChart.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/components/Sparkline.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/db/migrations/013_generation_power.sql
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/db/normalizeMetricSnapshotCapturedAt.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Overview/widgets/GenerationTrendChartView.tsx
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/Overview/widgets/generationTrendChart.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - packages/shared/src/imagePlaylist.test.ts
  - apps/web/src/services/socket.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/metrics/solarGenerationProfile.test.ts
  - apps/server/src/db/metricSnapshotsSeed.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/Sparkline.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
-->

---
### Requirement: Development mock feed drives runtime metrics without bypassing the runtime path

In development mock mode (no real broker), the system SHALL feed simulated instantaneous metric readings into the runtime live-metrics store on an interval, so the standard accumulator and snapshot-writer pipeline produces the trend history from real runtime data. The simulated generation power SHALL follow a time-of-day solar profile. This mock feed SHALL run only in mock mode and SHALL NOT alter the production accumulator or snapshot-writer behavior.

#### Scenario: Mock feed populates runtime metrics in mock mode

- **WHEN** the server runs in mock mode
- **THEN** the system periodically writes simulated instantaneous readings into the runtime live-metrics store, and the trend history reflects a daily solar profile that updates over time

##### Example: Mock runtime path produces a solar bell curve

- **GIVEN** the server starts with `DATA_MODE=mock`
- **WHEN** the mock feed ticks through morning to midday samples
- **THEN** `live_metric_values.realTimePower` receives simulated instantaneous writes
- **AND** subsequent snapshots build a trend history with a noon peak and near-zero night values

#### Scenario: Mock feed is inactive outside mock mode

- **WHEN** the server runs in a non-mock data mode
- **THEN** the mock feed does not write simulated readings

##### Example: Production mode does not inject simulated metrics

- **GIVEN** the server starts with a real MQTT-backed data mode
- **WHEN** background services start
- **THEN** `MockMetricsFeedService` does not schedule interval writes
- **AND** only real runtime ingestion updates the live-metrics store

<!-- @trace
source: align-overview-cards-to-better-reference
updated: 2026-06-10
code:
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/routes/image-playlist.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/metrics/solarGenerationProfile.ts
  - apps/web/src/services/api.ts
  - apps/server/src/services/generationTrendSeries.ts
  - docs/reference-match/settings-images-layout-refactor-plan.md
  - apps/web/src/hooks/useImagesAutoplay.ts
  - .env.example
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.ts
  - apps/web/vite.config.ts
  - apps/server/src/server-startup.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/styles/management.css
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/services/runtimeOrigin.ts
  - apps/web/src/pages/Overview/widgets/generationTrendChart.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/components/Sparkline.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/db/migrations/013_generation_power.sql
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/db/normalizeMetricSnapshotCapturedAt.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Overview/widgets/GenerationTrendChartView.tsx
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/Overview/widgets/generationTrendChart.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - packages/shared/src/imagePlaylist.test.ts
  - apps/web/src/services/socket.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/metrics/solarGenerationProfile.test.ts
  - apps/server/src/db/metricSnapshotsSeed.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/Sparkline.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
-->