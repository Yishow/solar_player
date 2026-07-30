# playback-display-runtime-controls Specification

## Purpose

TBD - created by archiving change 'apply-playback-brightness-orientation-runtime'. Update Purpose after archive.

## Requirements

### Requirement: Apply persisted brightness to the playback display surface

The playback display surface SHALL apply the persisted `PlaybackSettings.brightness` value as a surface-level brightness so operators see the configured brightness on the live display. A brightness of 100 SHALL render with no change (identity).

#### Scenario: Brightness below 100 darkens the surface

- **WHEN** playback settings resolve to `brightness = 60`
- **THEN** the display surface renders with a CSS brightness filter equivalent to 0.6
- **AND** page content coordinates are unchanged

#### Scenario: Missing or default brightness is identity

- **WHEN** settings are not yet loaded or `brightness = 100`
- **THEN** the display surface renders without a brightness filter

##### Example: Brightness mapping

| brightness | Applied filter |
| ----- | ----- |
| 100 | (none) |
| 60 | `brightness(0.6)` |
| 150 | `brightness(1.5)` |


<!-- @trace
source: apply-playback-brightness-orientation-runtime
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
-->

---
### Requirement: Apply persisted orientation to the playback display surface

The playback display surface SHALL apply the persisted `PlaybackSettings.orientation`. `portrait` SHALL rotate the surface 90 degrees for an upright physical screen; `landscape` (and missing values) SHALL render with no rotation.

#### Scenario: Portrait rotates the surface

- **WHEN** playback settings resolve to `orientation = "portrait"`
- **THEN** the display surface applies a 90-degree rotation transform
- **AND** the FHD 1920×1080 content layout is not re-coordinated

#### Scenario: Landscape is identity

- **WHEN** `orientation = "landscape"` or settings are not loaded
- **THEN** the display surface applies no rotation transform


<!-- @trace
source: apply-playback-brightness-orientation-runtime
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
-->

---
### Requirement: Seed image playlist content for the 4-up thumbnail strip

The seed data SHALL provide at least four image playlist entries so the `/images` playback page can render its 4-up thumbnail strip for witness review.

#### Scenario: Images page renders four thumbnails after seed

- **WHEN** the database is seeded
- **THEN** the image playlist exposes at least four ordered entries
- **AND** `/images` renders the 4-up thumbnail strip rather than a single centered thumbnail


<!-- @trace
source: apply-playback-brightness-orientation-runtime
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
-->

---
### Requirement: Project build stays green

The repository SHALL build without TypeScript errors via `pnpm run build`.

#### Scenario: Build passes after runtime controls land

- **WHEN** `pnpm run build` runs
- **THEN** it completes with no TypeScript errors

<!-- @trace
source: apply-playback-brightness-orientation-runtime
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
-->

---
### Requirement: Drive playback schedules from trusted App Time

Playback schedule eligibility SHALL use Server-authoritative App Time when state is synced or stale. It SHALL freeze the last trusted eligibility result in waiting or time-untrusted while relative page rotation continues.

#### Scenario: Client OS Clock changes while App Time is synced

- **WHEN** the Raspberry Pi OS Clock moves forward or backward
- **THEN** playback schedule eligibility remains based on monotonic App Time
- **AND** the visible rotation does not jump because of the OS Clock change

<!-- @trace
source: server-authoritative-app-time
updated: 2026-07-30
code:
  - .env.example
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - docs/ops/judgment.md
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/components/AppHeader.tsx
  - scripts/capture-fhd-witness.mjs
  - docs/architecture/default-playback-profile.md
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/routes/devices.ts
  - apps/web/src/services/appTime.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - docs/ops/dispatch.md
  - deploy.md
  - apps/web/src/pages/EnergyHistory/index.tsx
  - packages/shared/src/playback.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - docs/architecture/server-app-time.md
  - apps/web/src/pages/DeviceFleet/route.ts
  - deploy/install-thin-kiosk.sh
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - docs/agents/issue-tracker.md
  - packages/shared/src/deviceIdentity.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/server/src/fastify.ts
  - scripts/fhd-witness-config.mjs
  - apps/server/src/routes/playback.ts
  - packages/shared/src/displayClientContext.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/services/deviceCredentialService.ts
  - apps/web/src/hooks/playbackRouteSync.ts
  - CLAUDE.md
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - packages/shared/src/devicePairing.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/hooks/useAppTime.ts
  - packages/shared/src/appTime.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/realtime/serverTimeSignal.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - docs/ops/conventions.md
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - scripts/deploy.test.mjs
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - AGENTS.md
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/services/deviceGroupService.ts
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/ops/maintenance.md
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/config.ts
  - apps/server/src/routes/display-story.ts
  - packages/shared/src/index.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - docs/ops/delegation.md
  - docs/ops/workflow.md
  - apps/web/src/pages/energyMonitoringState.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/server/src/services/displayClientContextService.ts
tests:
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/web/src/services/appTime.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/realtime/serverTimeSignal.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/playbackRouteSync.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
  - apps/web/src/hooks/useAppTime.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
-->