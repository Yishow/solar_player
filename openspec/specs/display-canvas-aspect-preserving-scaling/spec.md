# display-canvas-aspect-preserving-scaling Specification

## Purpose

TBD - created by archiving change 'fix-display-canvas-uniform-scaling-letterbox'. Update Purpose after archive.

## Requirements

### Requirement: Display canvas scales uniformly to preserve aspect ratio

The display canvas SHALL scale its fixed design surface by a single uniform factor equal to the smaller of the horizontal and vertical fit ratios, so the design aspect ratio is preserved on any viewport. The canvas SHALL NOT apply independent horizontal and vertical scale factors.

#### Scenario: Uniform scale chosen from the limiting dimension

- **WHEN** the canvas layout is computed for a viewport
- **THEN** the scale SHALL equal the smaller of (viewport width / design width) and (viewport height / design height)

##### Example: layout computation (design 1920x1080)

| Viewport (w x h) | scale  | offsetX | offsetY |
| ---------------- | ------ | ------- | ------- |
| 1920 x 1080      | 1.0    | 0       | 0       |
| 1280 x 720       | 0.6667 | 0       | 0       |
| 1920 x 1200      | 1.0    | 0       | 60      |
| 1080 x 1920      | 0.5625 | 0       | 656     |


<!-- @trace
source: fix-display-canvas-uniform-scaling-letterbox
updated: 2026-05-23
code:
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/main.tsx
  - apps/web/src/services/socket.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/index.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/hooks/screenWakeLock.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/server/package.json
  - apps/server/src/routes/display-story.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - .env.example
  - apps/web/src/pages/DeviceStatus/index.tsx
  - AGENTS.md
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/web/index.html
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/config.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/package.json
  - packages/shared/tsconfig.json
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/recovery/installCrashRecovery.ts
tests:
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/server-startup.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
-->

---
### Requirement: Off-aspect viewports are letterboxed and centered

When the viewport aspect ratio does not match the design aspect ratio, the scaled canvas SHALL be centered within the viewport, leaving equal letterbox margins on the two opposite sides. The letterbox area SHALL use the stage background color.

#### Scenario: Centered with equal margins

- **WHEN** the viewport is taller (relative to width) than the design aspect ratio
- **THEN** the scaled canvas SHALL be centered vertically with equal top and bottom letterbox margins

##### Example: taller viewport centers the canvas with equal top and bottom margins

- **GIVEN** a viewport of `1920 x 1200` and a design surface of `1920 x 1080`
- **WHEN** the canvas layout is computed
- **THEN** the scale SHALL remain `1.0`
- **AND** the canvas SHALL be offset by `60px` from the top and `60px` from the bottom

#### Scenario: 16:9 viewport renders without letterbox

- **WHEN** the viewport aspect ratio equals the design aspect ratio (16:9)
- **THEN** both letterbox offsets SHALL be zero
- **AND** the rendered result SHALL be equivalent to a single uniform scale with no centering offset

<!-- @trace
source: fix-display-canvas-uniform-scaling-letterbox
updated: 2026-05-23
code:
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/main.tsx
  - apps/web/src/services/socket.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/index.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/hooks/screenWakeLock.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/server/package.json
  - apps/server/src/routes/display-story.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - .env.example
  - apps/web/src/pages/DeviceStatus/index.tsx
  - AGENTS.md
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/web/index.html
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/config.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/package.json
  - packages/shared/tsconfig.json
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/recovery/installCrashRecovery.ts
tests:
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/server-startup.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
-->