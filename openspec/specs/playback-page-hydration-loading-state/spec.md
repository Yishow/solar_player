# playback-page-hydration-loading-state Specification

## Purpose

TBD - created by archiving change 'avoid-playback-page-blank-flash-on-hydration'. Update Purpose after archive.

## Requirements

### Requirement: Playback pages show a loading state instead of blank during cold hydration

Each live playback page SHALL render a shared loading state component during the cold first-paint hydration window instead of rendering nothing. The existing defer decision SHALL be preserved (the page SHALL still avoid building its live view model until hydration finishes), but the deferred output SHALL be a visible loading placeholder rather than empty content.

#### Scenario: Cold hydration renders the loading state

- **WHEN** a live playback page is in its cold first-paint defer window (runtime hydration enabled, live stage, loading, no loaded envelope yet)
- **THEN** the page SHALL render the shared loading state component
- **AND** it SHALL NOT render empty/null content for the content area

##### Example:

- **GIVEN** runtime hydration is enabled, the page is in `live`, `isLoading=true`, and `lastLoadedEnvelope=null`
- **WHEN** the page evaluates the shared defer helper
- **THEN** it renders `DisplayPageLoadingState`
- **AND** the defer branch does not return `null`

#### Scenario: Defer still precedes view model construction

- **WHEN** a live playback page evaluates its defer guard
- **THEN** the guard SHALL be evaluated before the page builds its runtime view model

##### Example:

- **GIVEN** a playback page source file with a shared runtime hydration guard and a page-specific view model builder
- **WHEN** the defer branch is read from top to bottom
- **THEN** the shared defer helper appears before the view model builder call


<!-- @trace
source: avoid-playback-page-blank-flash-on-hydration
updated: 2026-05-23
code:
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/index.html
  - apps/web/package.json
  - apps/server/src/routes/device.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/index.ts
  - apps/server/src/server-startup.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/tsconfig.json
  - apps/web/src/services/socket.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/package.json
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - packages/shared/src/displayPageFreshness.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/server/src/config.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - AGENTS.md
  - .env.example
  - apps/web/src/recovery/reloadController.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/main.tsx
tests:
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/routes/playback.test.ts
-->

---
### Requirement: Loading state is accessible and respects reduced motion

The shared loading state SHALL expose an accessible status role and SHALL NOT play motion when the user agent requests reduced motion.

#### Scenario: Loading state exposes a status role

- **WHEN** the loading state renders
- **THEN** it SHALL expose `role="status"` with a polite live region

##### Example:

- **GIVEN** the shared loading state component renders
- **WHEN** assistive technology inspects the root node
- **THEN** it finds `role="status"` and `aria-live="polite"`

#### Scenario: Reduced motion disables animation

- **WHEN** the user agent reports `prefers-reduced-motion: reduce`
- **THEN** the loading state SHALL NOT play its animation

##### Example:

- **GIVEN** the loading state pulse animation is defined
- **WHEN** the browser matches `prefers-reduced-motion: reduce`
- **THEN** the pulse animation is disabled with `animation: none`

<!-- @trace
source: avoid-playback-page-blank-flash-on-hydration
updated: 2026-05-23
code:
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/index.html
  - apps/web/package.json
  - apps/server/src/routes/device.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/index.ts
  - apps/server/src/server-startup.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/tsconfig.json
  - apps/web/src/services/socket.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/package.json
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - packages/shared/src/displayPageFreshness.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/server/src/config.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - AGENTS.md
  - .env.example
  - apps/web/src/recovery/reloadController.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/main.tsx
tests:
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/routes/playback.test.ts
-->