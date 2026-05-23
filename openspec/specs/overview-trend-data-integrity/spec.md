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