# metric-history-retention Specification

## Purpose

TBD - created by archiving change 'add-metric-history-retention-pruning'. Update Purpose after archive.

## Requirements

### Requirement: Metric snapshots are pruned beyond a retention window

The system SHALL periodically delete rows from `metric_snapshots` whose `captured_at` is older than a configurable snapshot retention window. The retention window SHALL default to 90 days and SHALL be configurable via the `METRIC_SNAPSHOT_RETENTION_DAYS` environment variable.

#### Scenario: Snapshots older than the window are deleted

- **WHEN** a retention sweep runs with a configured snapshot retention window
- **THEN** rows in `metric_snapshots` whose `captured_at` is older than the cutoff SHALL be deleted
- **AND** rows whose `captured_at` is within the window SHALL be retained

##### Example: snapshot cutoff computation

- **GIVEN** the current time is `2026-05-22T00:00:00.000Z` and snapshot retention is 90 days
- **WHEN** the cutoff is computed
- **THEN** the snapshot cutoff SHALL be `2026-02-21T00:00:00.000Z`
- **AND** a row captured at `2026-02-20T23:59:59.000Z` SHALL be deleted while a row captured at `2026-02-21T00:00:01.000Z` SHALL be retained


<!-- @trace
source: add-metric-history-retention-pruning
updated: 2026-05-23
code:
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - .env.example
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/tsconfig.json
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/main.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/package.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/realtime/SocketService.ts
  - apps/server/package.json
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/Images/index.tsx
  - AGENTS.md
  - apps/web/src/pages/Solar/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/config.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/device.ts
  - apps/web/index.html
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
tests:
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/device.test.ts
-->

---
### Requirement: Daily energy summaries are pruned beyond a retention window

The system SHALL periodically delete rows from `daily_energy_summaries` whose `date` is older than a configurable summary retention window. The retention window SHALL default to 1825 days and SHALL be configurable via the `DAILY_SUMMARY_RETENTION_DAYS` environment variable.

#### Scenario: Summaries older than the window are deleted

- **WHEN** a retention sweep runs with a configured summary retention window
- **THEN** rows in `daily_energy_summaries` whose `date` is older than the cutoff date SHALL be deleted
- **AND** rows whose `date` is on or after the cutoff date SHALL be retained


<!-- @trace
source: add-metric-history-retention-pruning
updated: 2026-05-23
code:
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - .env.example
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/tsconfig.json
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/main.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/package.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/realtime/SocketService.ts
  - apps/server/package.json
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/Images/index.tsx
  - AGENTS.md
  - apps/web/src/pages/Solar/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/config.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/device.ts
  - apps/web/index.html
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
tests:
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/device.test.ts
-->

---
### Requirement: Cumulative counters are never pruned

The retention sweep SHALL NOT delete any rows from `cumulative_counters`, because those rows hold the running totals that drive current displayed metrics.

#### Scenario: Counters survive a retention sweep

- **WHEN** a retention sweep runs
- **THEN** all rows in `cumulative_counters` SHALL remain unchanged


<!-- @trace
source: add-metric-history-retention-pruning
updated: 2026-05-23
code:
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - .env.example
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/tsconfig.json
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/main.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/package.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/realtime/SocketService.ts
  - apps/server/package.json
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/Images/index.tsx
  - AGENTS.md
  - apps/web/src/pages/Solar/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/config.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/device.ts
  - apps/web/index.html
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
tests:
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/device.test.ts
-->

---
### Requirement: VACUUM runs only after a prune and at a limited frequency

After a retention sweep that actually deleted rows, the system SHALL run `VACUUM` to reclaim disk space, but only when VACUUM is enabled and at least one VACUUM interval has elapsed since the previous VACUUM. When no rows were deleted, or VACUUM is disabled, or the interval has not elapsed, the sweep SHALL NOT run `VACUUM`.

#### Scenario: VACUUM decision after a sweep

- **WHEN** a retention sweep completes
- **THEN** the system SHALL run `VACUUM` only if VACUUM is enabled, rows were deleted, and the time since the last VACUUM is at least the configured interval

##### Example: VACUUM decision

| vacuumEnabled | deletedRows | ms since last VACUUM | vacuumIntervalMs | Run VACUUM? |
| ------------- | ----------- | -------------------- | ---------------- | ----------- |
| true          | 120         | 700000000            | 604800000        | true        |
| true          | 120         | 1000                 | 604800000        | false       |
| true          | 0           | 700000000            | 604800000        | false       |
| false         | 120         | 700000000            | 604800000        | false       |


<!-- @trace
source: add-metric-history-retention-pruning
updated: 2026-05-23
code:
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - .env.example
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/tsconfig.json
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/main.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/package.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/realtime/SocketService.ts
  - apps/server/package.json
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/Images/index.tsx
  - AGENTS.md
  - apps/web/src/pages/Solar/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/config.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/device.ts
  - apps/web/index.html
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
tests:
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/device.test.ts
-->

---
### Requirement: Retention sweep runs on a background schedule tied to server lifecycle

The retention sweep SHALL run on a fixed background interval while the server is running, and SHALL stop when the server closes. A sweep failure SHALL be logged and SHALL NOT crash the server or stop subsequent sweeps.

#### Scenario: Sweep stops on server close

- **WHEN** the server closes
- **THEN** the retention service SHALL stop its scheduled sweeps

#### Scenario: Sweep failure is isolated

- **WHEN** a retention sweep throws an error
- **THEN** the error SHALL be logged
- **AND** the server SHALL continue running and future sweeps SHALL still be scheduled

<!-- @trace
source: add-metric-history-retention-pruning
updated: 2026-05-23
code:
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - .env.example
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/tsconfig.json
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/main.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/package.json
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/realtime/SocketService.ts
  - apps/server/package.json
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/Images/index.tsx
  - AGENTS.md
  - apps/web/src/pages/Solar/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/config.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/device.ts
  - apps/web/index.html
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
tests:
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/device.test.ts
-->