# display-page-per-metric-freshness Specification

## Purpose

TBD - created by archiving change 'refine-rotation-per-metric-freshness'. Update Purpose after archive.

## Requirements

### Requirement: Resolve the live metric keys a page requires

The system SHALL resolve, for each live-data display page, the set of underlying live metric keys it consumes from the display metric requirements. For an `mqtt-metric` requirement the underlying key SHALL be its requirement key; for a `derived-metric` requirement the underlying keys SHALL be its dependency keys, or its requirement key when no dependency keys are declared.

#### Scenario: Page metric keys derived from requirements

- **WHEN** the live metric keys for a page are resolved from the display metric requirements
- **THEN** the result SHALL include the requirement key of each `mqtt-metric` requirement for that page
- **AND** it SHALL include the dependency keys of each `derived-metric` requirement for that page

##### Example: solar page key resolution

- **GIVEN** the `solar` page has `mqtt-metric` requirements `realTimePower` and `todayGeneration`, and a `derived-metric` requirement `selfConsumptionRatio` with dependency keys `selfConsumptionRatio`, `selfConsumptionEnergy`, `consumptionEnergy`
- **WHEN** the live metric keys for `solar` are resolved
- **THEN** the result SHALL include `realTimePower`, `todayGeneration`, `selfConsumptionEnergy`, and `consumptionEnergy`

<!-- @trace
source: refine-rotation-per-metric-freshness
updated: 2026-05-23
code:
  - apps/web/src/services/socket.ts
  - apps/server/package.json
  - packages/shared/src/displayStory.ts
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/main.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Solar/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/tsconfig.json
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/config.ts
  - apps/web/src/recovery/crashRecovery.ts
  - packages/shared/src/index.ts
  - AGENTS.md
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/package.json
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/app/router.tsx
  - apps/web/index.html
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/server/src/services/displayStoryService.ts
  - .env.example
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/pages/Images/index.tsx
tests:
  - apps/server/src/routes/device.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
-->

---
### Requirement: Evaluate page runtime freshness over the page's required metrics

The system SHALL evaluate runtime freshness for a page using only the live metrics that page requires. A page SHALL be fresh when every required metric that is present in the live snapshot has a timestamp within the freshness window. A page SHALL be stale when any present required metric is older than the freshness window, or when none of its required metrics are present in the snapshot. The evaluation SHALL report the oldest (stalest) present required metric key and timestamp for use in skip detail. The evaluation SHALL also report whether every required metric is present in the live snapshot (required-data presence), so callers can distinguish a page that has prior data but is stale from a page that has never received a required metric.

#### Scenario: Stale required metric makes the page stale

- **WHEN** at least one required metric present in the snapshot has a timestamp older than the freshness window
- **THEN** the page freshness evaluation SHALL report the page as stale
- **AND** it SHALL report that metric's key and timestamp as the stalest present required metric

##### Example: one stale required metric overrides unrelated fresh metrics

- **GIVEN** `solar` requires `realTimePower`, `todayGeneration`, and `systemEfficiency`
- **AND** the snapshot contains `realTimePower` at age 5000 ms, `todayGeneration` at age 10000 ms, and `systemEfficiency` at age 60000 ms
- **WHEN** the page freshness is evaluated with a 30000 ms freshness window
- **THEN** the page SHALL be reported as stale
- **AND** `systemEfficiency` SHALL be reported as the stalest present required metric

#### Scenario: No required metrics present makes the page stale

- **WHEN** none of the page's required metrics are present in the snapshot
- **THEN** the page freshness evaluation SHALL report the page as stale

##### Example: freshness over required metrics (window = 30000 ms, now = 2026-05-22T00:00:30.000Z)

| Required keys present (key@ageMs)            | Fresh? | Stalest key |
| -------------------------------------------- | ------ | ----------- |
| realTimePower@5000, todayGeneration@10000    | true   | (none)      |
| realTimePower@5000, todayGeneration@60000    | false  | todayGeneration |
| (none present)                               | false  | (none)      |

#### Scenario: All required metrics present but stale reports required-data present

- **WHEN** every required metric for the page is present in the snapshot and at least one is older than the freshness window
- **THEN** the page freshness evaluation SHALL report the page as stale
- **AND** it SHALL report required-data presence as true

#### Scenario: A missing required metric reports required-data absent

- **WHEN** at least one required metric for the page is absent from the snapshot
- **THEN** the page freshness evaluation SHALL report required-data presence as false
- **AND** it SHALL report the page as stale

<!-- @trace
source: playback-broker-failure-resilience
updated: 2026-06-09
code:
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/components/displayPageCards.tsx
  - packages/shared/src/weather.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/styles/global.css
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/hooks/displaySyncPlaybackReload.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.test.ts
  - apps/web/src/hooks/displaySyncPlaybackReload.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - packages/shared/src/imagePlaylist.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
-->

---
### Requirement: Rotation uses per-page freshness instead of the global latest timestamp

The display rotation evaluation SHALL determine each live-data page's freshness from that page's own required-metric freshness, not from a single global latest timestamp across all metrics. A page SHALL NOT be treated as fresh solely because unrelated metrics updated recently. A live-data page whose required metrics are all present but stale (transient outage) SHALL remain in the playable pages and render last-known values. Rotation SHALL skip a live-data page for runtime-data reasons only when at least one of its required metrics has never been received; the `stale-runtime` skip reason SHALL be reserved for that never-had-data case.

#### Scenario: One page stale while another stays fresh under the same snapshot

- **GIVEN** two live-data pages require different metric sets and the live snapshot has page A's required metrics fresh but page B's required metric stale
- **WHEN** the rotation conditions are built for the current snapshot
- **THEN** page B SHALL be evaluated as stale under its own required metrics
- **AND** page A SHALL NOT be evaluated as stale

#### Scenario: Stale page with prior data stays playable during a broker outage

- **GIVEN** a live-data page whose fallback policy for stale data is `hide`
- **AND** every required metric for that page is present in the snapshot but at least one is older than the freshness window
- **WHEN** the rotation conditions are built for the current snapshot
- **THEN** the page SHALL remain in the playable pages
- **AND** the page SHALL NOT be skipped with skip reason `stale-runtime`

#### Scenario: Page that never received a required metric is skipped

- **GIVEN** a live-data page whose fallback policy for stale data is `hide`
- **AND** at least one required metric for that page is absent from the snapshot
- **WHEN** the rotation conditions are built for the current snapshot
- **THEN** the page SHALL be skipped with skip reason `stale-runtime`

#### Scenario: Mock mode and freshness window source are preserved

- **WHEN** the MQTT status reason is `mock`
- **THEN** per-page freshness evaluation SHALL preserve the existing mock-mode behavior
- **AND** the freshness window SHALL continue to be sourced from the configured MQTT message timeout

<!-- @trace
source: playback-broker-failure-resilience
updated: 2026-06-09
code:
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/components/displayPageCards.tsx
  - packages/shared/src/weather.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/styles/global.css
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/hooks/displaySyncPlaybackReload.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.test.ts
  - apps/web/src/hooks/displaySyncPlaybackReload.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - packages/shared/src/imagePlaylist.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
-->

---
### Requirement: Resolve per-metric freshness through the global category Policy

Each required display metric SHALL map to one Freshness Policy category. Page freshness SHALL aggregate the Server-authoritative states of its required metrics and SHALL NOT apply an independent Client threshold.

#### Scenario: Required metrics have mixed states

- **WHEN** a page requires one live realtime metric and one stale daily metric
- **THEN** the page freshness reports stale with the stale metric and sourceTimestamp
- **AND** unrelated metrics do not alter the result

<!-- @trace
source: server-authoritative-freshness-policy
updated: 2026-07-30
code:
  - packages/shared/src/freshnessPolicy.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/db/migrations/032_device_profile_rollout.sql
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/web/src/hooks/useFreshnessState.ts
  - docs/ops/judgment.md
  - apps/server/src/config.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/server/src/db/migrations/033_freshness_policy.sql
  - packages/shared/src/playback.ts
  - apps/web/src/services/profileRollout.ts
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/services/deviceCredentialService.ts
  - apps/server/src/routes/playback-profiles.ts
  - packages/shared/src/displayClientContext.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/playbackRouteSync.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/web/src/pages/PlaybackProfiles/PlaybackProfilesContent.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/agents/issue-tracker.md
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - docs/ops/device-pairing-and-recovery.md
  - docs/ops/dispatch.md
  - packages/shared/src/playbackProfileVersion.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - docs/architecture/server-app-time.md
  - apps/server/src/services/householdEquivalenceService.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/routes/freshness-policy.ts
  - apps/server/src/routes/sustainability-story.ts
  - scripts/capture-fhd-witness.mjs
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/app/routeMeta.ts
  - docs/ops/delegation.md
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - apps/server/src/metrics/liveMetrics.ts
  - apps/server/src/app.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/components/AppHeader.tsx
  - .env.example
  - packages/shared/src/appTime.ts
  - apps/web/src/pages/PlaybackProfiles/PlaybackProfilePreviewPanel.tsx
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/realtime/serverTimeSignal.ts
  - docs/ops/maintenance.md
  - AGENTS.md
  - packages/shared/src/displayReadiness.ts
  - deploy.md
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/playbackProfileGovernanceService.ts
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/deviceIdentity.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/db/migrations/029_device_group_management.sql
  - deploy/install-thin-kiosk.sh
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - packages/shared/src/deviceProfileRollout.ts
  - apps/server/src/routes/devices.ts
  - scripts/device-scoped-playback-load.mjs
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - CLAUDE.md
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - docs/ops/conventions.md
  - apps/server/src/fastify.ts
  - docs/ops/workflow.md
  - scripts/fhd-witness-config.mjs
  - apps/web/src/hooks/useAppTime.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - apps/server/src/routes/playback.ts
  - scripts/verify.test.mjs
  - apps/server/src/services/playbackProfileService.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - docs/ops/device-scoped-playback-test-matrix.md
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - packages/shared/src/displayPageFreshness.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/routes/metrics.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/DeviceFleet/route.ts
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/server/src/services/displayClientContextService.ts
  - package.json
  - apps/server/src/db/migrations/031_playback_profile_versions.sql
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/freshnessPolicyService.ts
  - apps/server/src/services/deviceGroupService.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - apps/server/src/services/deviceProfileRolloutService.ts
  - docs/architecture/device-scoped-multisite-playback.md
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - docs/openapi.yaml
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/PlaybackProfiles/index.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - deploy/start-solar-kiosk.sh
  - deploy/stop-solar-kiosk.sh
  - apps/web/src/services/appTime.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/pages/PlaybackProfiles/viewModel.ts
  - apps/web/src/pages/PlaybackProfiles/playbackProfiles.css
  - docs/architecture/default-playback-profile.md
  - packages/shared/src/devicePairing.ts
  - scripts/device-scoped-playback-load.test.mjs
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
tests:
  - apps/web/src/hooks/useAppTime.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/services/profileRollout.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/hooks/useFreshnessState.test.ts
  - apps/server/src/services/deviceProfileRolloutService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/web/src/services/appTime.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - packages/shared/src/freshnessPolicy.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/PlaybackProfiles/index.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/web/src/hooks/playbackRouteSync.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/routes/playback-profiles.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/routes/freshness-policy.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/server/src/services/playbackProfileGovernanceService.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/web/src/pages/PlaybackProfiles/viewModel.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/realtime/serverTimeSignal.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/services/freshnessPolicyService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
-->

---
### Requirement: Per-metric freshness is evaluated on scoped metric identity

Freshness evaluation for a playback page SHALL use the resolved `(metricScope, metricKey)` identity for each underlying live metric. A healthy reading from another site MUST NOT satisfy or refresh a stale dependency for the current site.

#### Scenario: CL metric is stale while KN is fresh
- **WHEN** a CL page requires `realTimePower`, the CL reading is stale, and the KN reading with the same semantic metric key is fresh
- **THEN** the CL requirement remains stale
- **AND** the KN timestamp SHALL NOT refresh the CL freshness result

#### Scenario: Page uses an explicit global dependency
- **WHEN** a page requirement explicitly resolves a dependency under `global`
- **THEN** freshness is evaluated against the global reading for that dependency
- **AND** the result remains labeled with `metricScope = global`

---
### Requirement: Derived freshness follows registry dependency evaluation

For a registered derived metric, page freshness SHALL use the Derived Metric Registry evaluation result and its actual resolved metric dependencies. The derived freshness state SHALL be no better than the worst dependency freshness, and its effective timestamp SHALL be no newer than the oldest metric dependency that contributed to the value.

#### Scenario: One dependency is stale
- **WHEN** a derived metric has one live dependency and one stale dependency
- **THEN** the derived metric is stale
- **AND** the live dependency's newer timestamp SHALL NOT make the derived metric appear fresh

#### Scenario: Registry fallback retains last good value
- **WHEN** a derived metric uses `retain-last-good`, a current dependency becomes unavailable, and the last materialized value remains displayed
- **THEN** freshness/readiness identify the current evaluation as degraded or unavailable according to the registry result
- **AND** the retained numeric value SHALL NOT be reported as freshly recomputed

<!-- @trace
source: add-derived-metric-registry
updated: 2026-08-31
code:
  - apps/server/src/metrics/liveMetrics.ts
  - start.ps1
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - packages/shared/src/displayCardData.ts
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/assets/assets.go
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - .agents/skills/openspec-apply-change/SKILL.md
  - .env.example
  - apps/server/src/app.ts
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - apps/server/src/services/SnapshotWriterService.ts
  - solar_mqtt_go/internal/display/display.go
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/displayReadinessService.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/web/src/services/api.ts
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/webui/webui.go
  - apps/server/src/services/displayOpsService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - apps/server/src/routes/metrics-history.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/storage/storage.go
  - apps/web/src/pages/Solar/viewModel.ts
  - solar_mqtt_go/go.mod
  - apps/server/src/services/derivedMetricCatalogService.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/web/src/services/socket.ts
  - packages/shared/src/displayEditorSchema.ts
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - apps/server/src/services/MetricResolver.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - .agents/skills/.openspec-target
  - apps/server/src/services/displayPagePublishingService.ts
  - solar_mqtt_go/internal/webui/web/js/app.js
  - packages/shared/src/derivedMetric.ts
  - apps/server/src/mqtt/ManagedSourceAdapter.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - apps/web/src/pages/DeviceStatus/layout.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/server/src/routes/derived-metrics.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - apps/server/src/services/playbackMetricAuthorizationService.ts
  - .agents/skills/openspec-explore/SKILL.md
  - apps/server/src/routes/calculation-settings.ts
  - apps/server/src/mqtt/SolarSourceAdapter.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/036_remove_managed_solar_topic_mappings.sql
  - solar_mqtt_go/internal/mqttbus/bus.go
  - packages/shared/src/widgetDataBinding.ts
  - solar_mqtt_go/start.ps1
  - apps/server/src/services/displayPreviewContextService.ts
  - solar_mqtt_go/build.ps1
  - start.sh
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/go.sum
  - apps/server/src/realtime/SocketService.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - docs/runbooks/pc-server-deploy.md
  - solar_mqtt_go/internal/schedule/schedule.go
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - apps/server/src/routes/metrics.ts
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/displayStory.ts
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - apps/server/src/services/displayDataPreviewService.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/displayPageFreshness.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.tsx
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/db/migrate.ts
  - apps/server/src/services/derivedMetricExpression.ts
  - apps/server/src/routes/data-source.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - apps/server/src/db/migrations/037_derived_metric_registry.sql
  - packages/shared/src/playbackMetricContract.ts
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/MqttSettings/factoryTopicSites.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/db/scopedMetricMigration.ts
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/tray/instance_unix.go
  - scripts/deploy.test.mjs
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/openspec-archive-change/SKILL.md
  - apps/web/src/pages/Overview/viewModel.ts
  - solar_mqtt_go/assets/tray.ico
  - packages/shared/src/index.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/db/migrations/038_derived_metric_site_scopes.sql
  - apps/server/src/services/derivedMetricRegistryService.ts
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/internal/webui/web/index.html
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/server/src/services/DailySummaryService.ts
tests:
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/routes/derived-metrics.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/mqtt/SolarSourceAdapter.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/web/src/pages/shared/widgetDataBinding.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
  - apps/server/src/services/managementSessionService.test.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/services/derivedMetricRegistryService.test.ts
  - apps/server/src/app.test.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/calculation-settings.test.ts
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - apps/server/src/services/derivedMetricExpression.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - solar_mqtt_go/internal/service/control_contract_test.go
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/server/src/routes/display-preview-context.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/main_test.go
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/server/src/db/migrations/derivedMetricRegistry.test.ts
  - packages/shared/src/derivedMetric.test.ts
  - apps/server/src/services/MetricResolver.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - solar_mqtt_go/build_test.go
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/routes/display-data-preview.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/assets/assets_test.go
  - apps/web/src/pages/Overview/configRender.test.tsx
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/playbackMetricAuthorizationService.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataBindingCapability.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/tray/logfile_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/data-source.test.ts
-->