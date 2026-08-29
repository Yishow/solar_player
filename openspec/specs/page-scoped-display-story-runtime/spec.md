# page-scoped-display-story-runtime Specification

## Purpose

TBD - created by archiving change 'split-display-story-runtime-into-page-scoped-endpoints'. Update Purpose after archive.

## Requirements

### Requirement: Expose page-scoped display story runtime endpoints

The system SHALL expose `GET /api/display-story/:pageId` for the monitoring pages `overview`, `solar`, and `factory-circuit`, and each response SHALL contain only the requested page payload plus page-scoped metadata.

#### Scenario: Overview runtime requests only overview payload

- **WHEN** a client requests `GET /api/display-story/overview`
- **THEN** the response includes `pageId = "overview"`, `generatedAt`, and the `overview` story payload under `payload`
- **AND** the response SHALL NOT include sibling payloads for `solar` or `factory-circuit`

##### Example: Overview endpoint omits unrelated pages

- **GIVEN** the monitoring story service can compute `overview`, `solar`, and `factory-circuit`
- **WHEN** the client requests `GET /api/display-story/overview`
- **THEN** the response body contains only the `overview` payload wrapper
- **AND** the client does not need to extract `overview` from an aggregate response

#### Scenario: Unsupported page ids are rejected

- **WHEN** a client requests `GET /api/display-story/images`
- **THEN** the route rejects the request with the existing API error conventions
- **AND** no monitoring story payload is returned

<!-- @trace
source: split-display-story-runtime-into-page-scoped-endpoints
updated: 2026-05-23
code:
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Solar/index.tsx
  - packages/shared/src/displayStory.ts
  - apps/server/package.json
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - .env.example
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/index.html
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/config.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageCardRail.ts
  - scripts/dev-lib.mjs
  - AGENTS.md
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/main.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/server.ts
  - scripts/dev.mjs
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/components/AppHeader.tsx
  - packages/shared/tsconfig.json
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - packages/shared/src/cloneValue.ts
tests:
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/server/src/routes/device.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
-->

---

### Requirement: Keep aggregate display story route compatible during migration

The system SHALL keep `GET /api/display-story` available during the migration to page-scoped runtime endpoints, and the aggregate route SHALL remain equivalent to composing the page-scoped readers for `overview`, `solar`, and `factory-circuit`.

#### Scenario: Aggregate consumers continue receiving the legacy shape

- **WHEN** an existing client requests `GET /api/display-story`
- **THEN** the response still contains `generatedAt`, `overview`, `solar`, and `factoryCircuit`
- **AND** each page payload matches the corresponding page-scoped reader output for the same source snapshot

<!-- @trace
source: split-display-story-runtime-into-page-scoped-endpoints
updated: 2026-05-23
code:
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Solar/index.tsx
  - packages/shared/src/displayStory.ts
  - apps/server/package.json
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/displayClientLiveness.ts
  - .env.example
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/index.html
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/config.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageCardRail.ts
  - scripts/dev-lib.mjs
  - AGENTS.md
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/main.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/server.ts
  - scripts/dev.mjs
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/components/AppHeader.tsx
  - packages/shared/tsconfig.json
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - packages/shared/src/cloneValue.ts
tests:
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/server/src/routes/device.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
-->

---

### Requirement: Page-scoped Story runtime enforces Display Client Context

Page-scoped Story runtime endpoints SHALL resolve Site-sensitive sources from the authenticated Display Client Context. A page identifier SHALL NOT authorize access to another Site's data.

#### Scenario: CL Device requests the KN Factory Circuit page identifier

- **WHEN** a paired CL Device requests a KN-only page Story
- **THEN** the system rejects the request with a Site Scope mismatch response
- **AND** no KN metrics are returned

<!-- @trace
source: device-context-site-scoped-playback
updated: 2026-07-30
code:
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/deviceIdentity.ts
  - packages/shared/src/displayReadiness.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/routes/playback.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - docs/ops/workflow.md
  - apps/server/src/app.ts
  - docs/ops/maintenance.md
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/index.ts
  - apps/server/src/fastify.ts
  - scripts/fhd-witness-config.mjs
  - packages/shared/src/playback.ts
  - apps/server/src/routes/display-readiness.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/services/playbackProfileService.ts
  - packages/shared/src/displayClientContext.ts
  - .env.example
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - CLAUDE.md
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/devicePairing.ts
  - apps/server/src/services/deviceCredentialService.ts
  - docs/ops/conventions.md
  - deploy/install-thin-kiosk.sh
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/config.ts
  - docs/architecture/default-playback-profile.md
  - scripts/deploy.test.mjs
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/ops/delegation.md
  - apps/server/src/routes/device-groups.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/routes/devices.ts
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/services/displayStoryService.ts
  - AGENTS.md
  - scripts/capture-fhd-witness.mjs
  - .scratch/device-scoped-multisite-playback/spec.md
tests:
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

### Requirement: Page-scoped stories resolve all metric facets from one effective scope

A page-scoped monitoring story SHALL resolve displayed value, source value, freshness, fallback state, provenance, trend/history references, and display override from the same effective metric scope. A story MUST NOT combine a value from one site with freshness, source topics, history, or override state from another site.

#### Scenario: CL Overview story is built
- **WHEN** a CL display requests the `overview` story
- **THEN** every site-dependent story metric resolves from CL-scoped inputs
- **AND** each metric's freshness and provenance describe those same CL-scoped inputs

#### Scenario: Global dependency is part of a site story
- **WHEN** a page contract explicitly declares a global dependency for a CL or KN story
- **THEN** the story MAY include that global dependency
- **AND** its provenance SHALL identify the dependency scope as `global` rather than relabeling it as the device site
