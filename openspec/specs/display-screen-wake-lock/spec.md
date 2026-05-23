# display-screen-wake-lock Specification

## Purpose

TBD - created by archiving change 'add-display-screen-wake-lock'. Update Purpose after archive.

## Requirements

### Requirement: Playback shell keeps the screen awake

The playback shell SHALL request a `screen` wake lock while it is mounted and wake lock is enabled, on browsers that support the Wake Lock API. The wake lock SHALL be released when the playback shell unmounts.

#### Scenario: Wake lock acquired on supported browser

- **WHEN** the playback shell mounts on a browser that supports the Wake Lock API
- **THEN** the shell SHALL request a `screen` wake lock

#### Scenario: Wake lock released on unmount

- **WHEN** the playback shell unmounts after holding a wake lock
- **THEN** the shell SHALL release the wake lock sentinel


<!-- @trace
source: add-display-screen-wake-lock
updated: 2026-05-23
code:
  - apps/web/src/app/router.tsx
  - .env.example
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/config.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/tsconfig.json
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/routes/display-story.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - packages/shared/src/index.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/index.html
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/server/package.json
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/server-startup.ts
  - AGENTS.md
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/main.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
tests:
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
-->

---
### Requirement: Wake lock is re-acquired when the tab becomes visible

Because a `screen` wake lock is released by the system when the tab is hidden, the playback shell SHALL re-acquire the wake lock when the document becomes visible again and no active sentinel is held.

#### Scenario: Re-acquire on return to visible

- **WHEN** the document `visibilityState` changes to `visible` and no active wake lock sentinel is held
- **THEN** the shell SHALL request a new `screen` wake lock

#### Scenario: No re-acquire while a sentinel is still held

- **WHEN** the document becomes visible while an active wake lock sentinel is already held
- **THEN** the shell SHALL NOT request a duplicate wake lock

##### Example: re-acquire decision

| visibilityState | hasSentinel | Re-acquire? |
| --------------- | ----------- | ----------- |
| visible         | false       | true        |
| visible         | true        | false       |
| hidden          | false       | false       |


<!-- @trace
source: add-display-screen-wake-lock
updated: 2026-05-23
code:
  - apps/web/src/app/router.tsx
  - .env.example
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/config.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/tsconfig.json
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/routes/display-story.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - packages/shared/src/index.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/index.html
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/server/package.json
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/server-startup.ts
  - AGENTS.md
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/main.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
tests:
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
-->

---
### Requirement: Unsupported or denied wake lock degrades silently

The system SHALL detect Wake Lock API support before requesting a lock, and SHALL handle a rejected wake lock request without throwing. When wake lock is unsupported or a request is denied, playback SHALL continue unaffected.

#### Scenario: Unsupported browser does not attempt a request

- **WHEN** the browser does not expose `navigator.wakeLock`
- **THEN** the shell SHALL NOT attempt a wake lock request and SHALL NOT throw

#### Scenario: Rejected request is handled silently

- **WHEN** a `screen` wake lock request is rejected by the browser
- **THEN** the shell SHALL handle the rejection without throwing and playback SHALL continue

<!-- @trace
source: add-display-screen-wake-lock
updated: 2026-05-23
code:
  - apps/web/src/app/router.tsx
  - .env.example
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/config.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/tsconfig.json
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/routes/display-story.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - packages/shared/src/index.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/index.html
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/server/package.json
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/server-startup.ts
  - AGENTS.md
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/main.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
tests:
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
-->