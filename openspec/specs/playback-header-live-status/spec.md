# playback-header-live-status Specification

## Purpose

TBD - created by archiving change 'fix-playback-header-live-status-and-remove-fake-weather'. Update Purpose after archive.

## Requirements

### Requirement: Playback header reflects real connection status

The playback shell SHALL pass the live MQTT connection status to the header so the header connection badge reflects the real connection state. The header SHALL NOT display a hard-coded connected state when the real status is unknown or disconnected.

#### Scenario: Disconnected status shows a disconnected badge

- **WHEN** the live MQTT status reports the connection is not connected
- **THEN** the playback header connection badge SHALL show a disconnected state
- **AND** it SHALL NOT show a connected/Online state

##### Example: offline runtime does not pretend to be online

- **GIVEN** the live MQTT status is `connected=false`, `reason="offline"`, and `isHydrated=true`
- **WHEN** the playback shell resolves header connection metadata
- **THEN** the badge status SHALL be `disconnected`
- **AND** the badge label SHALL NOT be `Online`

#### Scenario: Status not yet known shows connecting

- **WHEN** the live MQTT status has not yet been received (not hydrated)
- **THEN** the playback header connection badge SHALL show a connecting state

##### Example: connection status mapping

| connected | reason         | isHydrated | Badge status  |
| --------- | -------------- | ---------- | ------------- |
| true      | connected      | true       | connected     |
| false     | reconnecting   | true       | connecting    |
| false     | offline        | true       | disconnected  |
| false     | (any)          | false      | connecting    |
| false     | mock           | true       | connected     |


<!-- @trace
source: fix-playback-header-live-status-and-remove-fake-weather
updated: 2026-05-23
code:
  - apps/server/package.json
  - apps/web/src/app/router.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/Solar/index.tsx
  - .env.example
  - packages/shared/tsconfig.json
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/config.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/server/src/realtime/SocketService.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/recovery/crashRecovery.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/main.tsx
  - packages/shared/src/displayPageFreshness.ts
  - AGENTS.md
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/index.html
  - packages/shared/src/index.ts
  - packages/shared/src/displayStory.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/components/displayCanvasLayout.ts
tests:
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/displayCanvasLayout.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
-->

---
### Requirement: Header does not display fabricated weather

The playback header SHALL NOT display weather information, because the system has no weather data source. The previously hard-coded weather value SHALL be removed.

#### Scenario: No weather element is rendered

- **WHEN** the playback header renders
- **THEN** it SHALL NOT render any weather value
- **AND** it SHALL NOT render the previously hard-coded `晴 26°C` string

<!-- @trace
source: fix-playback-header-live-status-and-remove-fake-weather
updated: 2026-05-23
code:
  - apps/server/package.json
  - apps/web/src/app/router.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/Solar/index.tsx
  - .env.example
  - packages/shared/tsconfig.json
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/config.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/server/src/realtime/SocketService.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/recovery/crashRecovery.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/main.tsx
  - packages/shared/src/displayPageFreshness.ts
  - AGENTS.md
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/index.html
  - packages/shared/src/index.ts
  - packages/shared/src/displayStory.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/components/displayCanvasLayout.ts
tests:
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/displayCanvasLayout.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
-->