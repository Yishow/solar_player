# playback-shell-crash-recovery Specification

## Purpose

TBD - created by archiving change 'add-playback-shell-crash-recovery-watchdog'. Update Purpose after archive.

## Requirements

### Requirement: Playback render errors are contained and recovered

The playback shell SHALL wrap its routed content in an error boundary that catches errors thrown during rendering. When an error is caught, the boundary SHALL render a minimal fallback view instead of an unhandled white screen, log the error, and request an automatic reload subject to the reload budget.

#### Scenario: Render error shows fallback and requests reload

- **WHEN** a playback route component throws during rendering
- **THEN** the error boundary SHALL render the fallback view instead of propagating the error to an unhandled white screen
- **AND** it SHALL request an automatic reload when the reload budget allows it

#### Scenario: Reload budget exhausted keeps fallback without reloading

- **WHEN** a render error occurs and the reload budget for the current window is already exhausted
- **THEN** the error boundary SHALL keep showing the fallback view
- **AND** it SHALL NOT trigger another automatic reload


<!-- @trace
source: add-playback-shell-crash-recovery-watchdog
updated: 2026-05-23
code:
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/main.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/config.ts
  - apps/web/src/services/api.ts
  - AGENTS.md
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/server/src/server-startup.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - .env.example
  - apps/web/src/app/router.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/recovery/reloadController.ts
  - apps/server/src/routes/device.ts
  - apps/web/package.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/Solar/index.tsx
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/index.html
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - packages/shared/tsconfig.json
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/package.json
tests:
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/components/headerConnectionMeta.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/brand.test.ts
-->

---
### Requirement: Dynamic import (chunk load) failures trigger recovery

The application entry SHALL listen for dynamic-module load failures via the `vite:preloadError` event and via `unhandledrejection` events whose reason is a recognized chunk load failure. When such a failure is detected, the system SHALL reload the application subject to the reload budget.

#### Scenario: Chunk load failure reloads the app

- **WHEN** a `vite:preloadError` event fires or an `unhandledrejection` whose reason matches a recognized dynamic-import failure occurs
- **THEN** the system SHALL reload the application when the reload budget allows it

#### Scenario: Non-chunk rejection is ignored by recovery

- **WHEN** an `unhandledrejection` occurs whose reason is not a recognized dynamic-import failure
- **THEN** the chunk-load recovery SHALL NOT reload the application

##### Example: chunk-load error classification

| Rejection reason text                                      | Recognized as chunk load failure |
| ---------------------------------------------------------- | -------------------------------- |
| "Failed to fetch dynamically imported module: /assets/x.js" | true                             |
| "error loading dynamically imported module"                | true                             |
| "Importing a module script failed"                         | true                             |
| "TypeError: cannot read properties of undefined"           | false                            |


<!-- @trace
source: add-playback-shell-crash-recovery-watchdog
updated: 2026-05-23
code:
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/main.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/config.ts
  - apps/web/src/services/api.ts
  - AGENTS.md
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/server/src/server-startup.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - .env.example
  - apps/web/src/app/router.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/recovery/reloadController.ts
  - apps/server/src/routes/device.ts
  - apps/web/package.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/Solar/index.tsx
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/index.html
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - packages/shared/tsconfig.json
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/package.json
tests:
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/components/headerConnectionMeta.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/brand.test.ts
-->

---
### Requirement: Playback rotation stall is detected and recovered

The playback shell SHALL run a watchdog that detects when rotation has stalled. A stall SHALL be reported only when playback is active, more than one playable page exists, and the current page has not advanced within its expected duration plus a fixed grace period. When a stall is reported, the system SHALL reload the application subject to the reload budget.

#### Scenario: Stalled rotation while playing triggers reload

- **WHEN** playback is active with more than one playable page and the current page has not advanced within its expected duration plus the grace period
- **THEN** the watchdog SHALL report a stall and request a reload when the reload budget allows it

#### Scenario: Single playable page does not count as a stall

- **WHEN** there is only one playable page and it does not advance
- **THEN** the watchdog SHALL NOT report a stall

#### Scenario: Paused playback does not count as a stall

- **WHEN** playback is not active
- **THEN** the watchdog SHALL NOT report a stall

##### Example: stall decision

| isPlaying | playablePageCount | msSinceLastPageChange | expectedDurationMs | graceMs | Stall? |
| --------- | ----------------- | --------------------- | ------------------ | ------- | ------ |
| true      | 3                 | 40000                 | 15000              | 15000   | true   |
| true      | 3                 | 20000                 | 15000              | 15000   | false  |
| true      | 1                 | 99000                 | 15000              | 15000   | false  |
| false     | 3                 | 99000                 | 15000              | 15000   | false  |


<!-- @trace
source: add-playback-shell-crash-recovery-watchdog
updated: 2026-05-23
code:
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/main.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/config.ts
  - apps/web/src/services/api.ts
  - AGENTS.md
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/server/src/server-startup.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - .env.example
  - apps/web/src/app/router.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/recovery/reloadController.ts
  - apps/server/src/routes/device.ts
  - apps/web/package.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/Solar/index.tsx
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/index.html
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - packages/shared/tsconfig.json
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/package.json
tests:
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/components/headerConnectionMeta.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/brand.test.ts
-->

---
### Requirement: Reload budget prevents infinite reload loops

The system SHALL enforce a reload budget that limits automatic reloads to a fixed maximum within a sliding time window. Reload attempts SHALL be recorded in a persistent per-session store so the budget survives the reloads it triggers. When the maximum is reached within the window, further automatic reloads SHALL be suppressed until older attempts fall outside the window.

#### Scenario: Reload allowed below the limit

- **WHEN** the number of recorded reloads within the window is below the maximum
- **THEN** the budget evaluation SHALL allow the reload and record the new attempt

#### Scenario: Reload suppressed at the limit

- **WHEN** the number of recorded reloads within the window has reached the maximum
- **THEN** the budget evaluation SHALL deny further automatic reloads until older attempts age out of the window

##### Example: budget evaluation (maxReloads=3, windowMs=600000)

| Recorded attempts within window | New attempt allowed |
| ------------------------------- | ------------------- |
| 0                               | true                |
| 2                               | true                |
| 3                               | false               |

<!-- @trace
source: add-playback-shell-crash-recovery-watchdog
updated: 2026-05-23
code:
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/main.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/config.ts
  - apps/web/src/services/api.ts
  - AGENTS.md
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/server/src/server-startup.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - .env.example
  - apps/web/src/app/router.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/recovery/reloadController.ts
  - apps/server/src/routes/device.ts
  - apps/web/package.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/Solar/index.tsx
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/index.html
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - packages/shared/tsconfig.json
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/package.json
tests:
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/components/headerConnectionMeta.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/brand.test.ts
-->

---
### Requirement: Recover an offline restart from the last-known-good App Shell

When network recovery cannot reach the Server, playback shell recovery SHALL attempt the validated cached App Shell and structured playback snapshot before presenting an offline unavailable state. It SHALL NOT count a successful cache recovery as a crash reload attempt.

#### Scenario: Dynamic import fails while Server is offline

- **WHEN** the active shell chunk cannot load from the network and a matching cached release exists
- **THEN** recovery loads the cached release
- **AND** it preserves the reload budget for actual failed recovery attempts

##### Example: Cached chunk recovery succeeds

- **GIVEN** release `r10` is the validated active cache
- **WHEN** `/assets/runtime.js` fails from the network while the Server is offline
- **THEN** one cached-shell recovery occurs without consuming the bounded network reload budget

<!-- @trace
source: offline-playback-cache-and-app-updates
updated: 2026-07-30
code:
  - apps/server/src/services/deviceLivenessRegistry.ts
  - packages/shared/src/playbackProfileVersion.ts
  - tests/offline-playback-browser.test.mjs
  - scripts/capture-fhd-witness.mjs
  - docs/ops/maintenance.md
  - apps/server/src/config.ts
  - scripts/verify.test.mjs
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/imagePlaylistService.ts
  - tests/browser/fixtures/runtime.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/PlaybackProfiles/playbackProfiles.css
  - apps/web/src/app/router.tsx
  - deploy/verify-thin-kiosk.sh
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - docs/architecture/default-playback-profile.md
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/hooks/useSafeAppUpdate.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/main.tsx
  - packages/shared/src/index.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/hooks/useAppTime.ts
  - apps/server/src/app.ts
  - apps/web/src/components/AppHeader.tsx
  - docs/ops/conventions.md
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/services/appUpdateProtocol.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/metrics/liveMetrics.ts
  - deploy/stop-solar-kiosk.sh
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/hooks/useFreshnessState.ts
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - packages/shared/src/deviceIdentity.contract.ts
  - scripts/fhd-witness-config.mjs
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - packages/shared/src/imagePlaylist.ts
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/web/src/pages/PlaybackProfiles/PlaybackProfilesContent.tsx
  - apps/server/src/services/playbackProfileGovernanceService.ts
  - apps/server/src/db/migrations/032_device_profile_rollout.sql
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - docs/ops/device-scoped-playback-test-matrix.md
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - packages/shared/src/freshnessPolicy.ts
  - docs/ops/workflow.md
  - docs/openapi.yaml
  - apps/web/src/pages/Images/viewModel.ts
  - deploy/install-thin-kiosk.sh
  - package.json
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/server/src/fastify.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/routes/playback-profiles.ts
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/web/src/services/offlinePlaybackStore.ts
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - scripts/deploy.test.mjs
  - packages/shared/src/displayClientContext.ts
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/services/socket.ts
  - docs/ops/dispatch.md
  - apps/web/src/hooks/useOfflinePlaybackSnapshot.ts
  - apps/server/src/services/deviceCredentialService.ts
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/services/api.ts
  - deploy.md
  - scripts/device-scoped-playback-load.test.mjs
  - apps/server/src/services/deviceProfileRolloutService.ts
  - scripts/device-scoped-playback-load.mjs
  - packages/shared/src/devicePairing.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/web/src/hooks/playbackRouteSync.ts
  - apps/server/src/realtime/serverTimeSignal.ts
  - docs/ops/device-pairing-and-recovery.md
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/vite-env.d.ts
  - apps/web/vite.config.ts
  - scripts/run-browser-smoke.mjs
  - apps/server/src/services/freshnessPolicyService.ts
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - docs/ops/delegation.md
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/PlaybackProfiles/viewModel.ts
  - apps/server/src/db/migrations/033_freshness_policy.sql
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/routes/device-groups.ts
  - docs/architecture/server-app-time.md
  - apps/server/src/routes/metrics.ts
  - apps/server/src/db/migrations/031_playback_profile_versions.sql
  - apps/web/src/services/profileRollout.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/devices.ts
  - docs/architecture/device-scoped-multisite-playback.md
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/server/src/services/deviceGroupService.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/sw.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/freshness-policy.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/appTime.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/web/src/pages/PlaybackProfiles/PlaybackProfilePreviewPanel.tsx
  - packages/shared/src/deviceProfileRollout.ts
  - AGENTS.md
  - docs/ops/judgment.md
  - packages/shared/src/sustainabilityStory.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/DeviceFleet/route.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceFleet/index.tsx
  - .env.example
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/PlaybackProfiles/index.tsx
  - apps/server/src/db/seed.ts
  - deploy/start-solar-kiosk.sh
  - apps/web/src/services/appTime.ts
  - CLAUDE.md
  - packages/shared/src/playback.ts
  - packages/shared/src/deviceIdentity.ts
tests:
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/playback-profiles.test.ts
  - apps/web/src/services/offlinePlaybackStore.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
  - apps/web/src/hooks/useAppTime.test.ts
  - apps/server/src/services/playbackProfileGovernanceService.test.ts
  - apps/web/src/pages/PlaybackProfiles/viewModel.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - tests/browser/offline-playback.spec.ts
  - apps/web/src/hooks/useSafeAppUpdate.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/hooks/useFreshnessState.test.ts
  - apps/server/src/services/freshnessPolicyService.test.ts
  - apps/web/src/services/profileRollout.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/hooks/useOfflinePlaybackSnapshot.test.ts
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/web/src/pages/PlaybackProfiles/index.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/routes/display-story.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/services/deviceProfileRolloutService.test.ts
  - apps/web/src/hooks/playbackRouteSync.test.ts
  - apps/web/src/services/appTime.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/realtime/serverTimeSignal.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/freshness-policy.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/freshnessPolicy.test.ts
-->