# server-authoritative-freshness-policy Specification

## Purpose

TBD - created by archiving change 'server-authoritative-freshness-policy'. Update Purpose after archive.

## Requirements

### Requirement: Manage four global Freshness Policy categories

The Server SHALL maintain exactly four Freshness Policy categories: realtime, daily, cumulative, and static. Non-static categories SHALL define strictly increasing delayedAfterMs, staleAfterMs, and historicalAfterMs values. Static data SHALL NOT degrade solely because of age.

#### Scenario: Seed the default category boundaries

- **WHEN** the Freshness Policy is initialized
- **THEN** it uses the default boundary table

##### Example: default boundaries

| Category | Delayed | Stale | Historical |
| --- | ---: | ---: | ---: |
| realtime | 30000 ms | 90000 ms | 1800000 ms |
| daily | 93600000 ms | 172800000 ms | 604800000 ms |
| cumulative | 600000 ms | 3600000 ms | 86400000 ms |
| static | never | never | never |

#### Scenario: Reject a non-increasing policy

- **WHEN** a trusted manager submits staleAfterMs less than or equal to delayedAfterMs
- **THEN** the Server returns 400 with a validation code
- **AND** the prior Policy remains active


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
### Requirement: Return Server-authoritative freshness metadata

For each datum, the Server SHALL calculate state as live, delayed, stale, historical, or unavailable from trusted App Time and sourceTimestamp. It SHALL return category, state, sourceTimestamp, ageMs, and nextTransitionAt.

#### Scenario: Source timestamp is missing

- **WHEN** a required datum has no sourceTimestamp
- **THEN** the Server returns state=unavailable
- **AND** it does not substitute response time or load time


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
### Requirement: Keep Site-scoped Readiness and Rotation consistent

Readiness, Story, and Effective Rotation SHALL consume the same Server freshness result for the authenticated Context Site Scope. A stale source from another Site SHALL NOT block or downgrade the current Site.

#### Scenario: KN cumulative data is historical while CL is live

- **WHEN** a CL Device requests Readiness and Rotation
- **THEN** CL uses the live CL result
- **AND** the KN historical result is excluded from the CL decision


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
### Requirement: Preserve freshness semantics during temporary disconnection

While App Time remains trusted, a disconnected Client SHALL advance the last Server freshness result using monotonic elapsed time. In time-untrusted state it SHALL freeze age and state and SHALL set ageFrozen=true.

#### Scenario: Client becomes time-untrusted

- **WHEN** 1800000 milliseconds pass after the last valid Time Signal
- **THEN** freshness state stops escalating
- **AND** ageMs stops increasing until synchronization returns


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
### Requirement: Present provenance for non-live data

Delayed data SHALL display the semantic label Data delayed, stale data SHALL display Non-live data, and historical data SHALL display Historical snapshot. Every non-live state SHALL show the complete source time and SHALL suppress live pulse, trend direction, and current-time wording.

#### Scenario: Historical metric is rendered

- **WHEN** a metric has state=historical
- **THEN** its UI displays Historical snapshot and the source timestamp
- **AND** it does not display live animation or wording that identifies the value as current

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
### Requirement: Metric age is independent of the server time zone

The system SHALL compute live metric freshness age from the true instant the reading was stored, regardless of the time zone the server process runs in.

Stored live metric timestamps exist in two forms: an ISO 8601 form carrying an explicit zone designator, and a zone-less form written by the database as a UTC wall clock. The system SHALL interpret the zone-less form as UTC. The system SHALL NOT interpret it as server local time.

#### Scenario: A reading stored by the database clock is fresh

- **WHEN** a live metric is written using the database current-timestamp value
- **AND** its freshness is evaluated immediately afterwards
- **THEN** the reported age SHALL be near zero
- **AND** the reported freshness state SHALL be `live`

#### Scenario: The same reading is evaluated under a non-UTC server time zone

- **WHEN** the server process runs in a time zone offset from UTC
- **AND** a live metric written using the database current-timestamp value is evaluated immediately afterwards
- **THEN** the reported age SHALL be near zero
- **AND** the reported age SHALL equal the age reported under a UTC server time zone, within normal evaluation jitter

#### Scenario: An ISO timestamp carrying a zone designator is unaffected

- **WHEN** a live metric is written with an ISO 8601 timestamp carrying an explicit zone designator
- **THEN** its reported age and freshness state SHALL be unchanged by zone-less-form interpretation

##### Example: interpretation by stored form

| Stored timestamp form | Interpreted as | Reported age for a just-written reading |
| --------------------- | -------------- | --------------------------------------- |
| `2026-08-06 17:14:25` | UTC | near zero |
| `2026-08-06T17:14:25.000Z` | UTC | near zero |
| `2026-08-06T17:14:25+08:00` | UTC+08:00 | near zero |
| unrecognized text | not a time | state `unavailable` |


<!-- @trace
source: repair-freshness-upload-and-playback-runtime-defects
updated: 2026-08-07
code:
  - docs/ops/workflow.md
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/app.ts
  - apps/server/src/metrics/metricTimestamp.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - packages/shared/src/managementAccess.ts
  - apps/server/src/metrics/liveMetrics.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/sw.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/routes/images.ts
  - docs/ops/conventions.md
tests:
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/metrics/metricTimestamp.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts
  - apps/web/src/sw.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/uploadsSecurityHeaders.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/metrics/liveMetrics.test.ts
-->

---
### Requirement: Timestamp normalization is idempotent and non-throwing

The system SHALL normalize a stored live metric timestamp to a form carrying an explicit zone designator before freshness evaluation. Normalization SHALL be idempotent, and SHALL NOT raise an error for unrecognized input.

#### Scenario: An already-zoned timestamp is not altered

- **WHEN** a timestamp already carrying an explicit zone designator is normalized
- **THEN** the result SHALL denote the same instant as the input
- **AND** normalizing the result again SHALL denote that same instant

#### Scenario: An unrecognized timestamp falls through to existing handling

- **WHEN** a stored timestamp cannot be recognized as either supported form
- **THEN** normalization SHALL return the input unchanged
- **AND** the existing unavailable-state handling SHALL apply
- **AND** normalization SHALL NOT raise an error


<!-- @trace
source: repair-freshness-upload-and-playback-runtime-defects
updated: 2026-08-07
code:
  - docs/ops/workflow.md
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/app.ts
  - apps/server/src/metrics/metricTimestamp.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - packages/shared/src/managementAccess.ts
  - apps/server/src/metrics/liveMetrics.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/sw.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/routes/images.ts
  - docs/ops/conventions.md
tests:
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/metrics/metricTimestamp.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts
  - apps/web/src/sw.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/uploadsSecurityHeaders.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/metrics/liveMetrics.test.ts
-->

---
### Requirement: Stored metric timestamps are normalized at every read boundary

Normalization SHALL happen where a stored live metric timestamp leaves the storage layer, not only on the freshness-evaluation path. Every surface that exposes such a timestamp externally SHALL expose the normalized form, so that two surfaces describing the same reading cannot disagree about its instant.

Because the stored column holds a mix of forms once normalized, the system SHALL order and compare these timestamps by the instant they denote, and SHALL NOT compare them lexicographically.

#### Scenario: The MQTT topic view and the live metrics view agree

- **WHEN** a topic mapping's last-received timestamp and the corresponding live metric timestamp describe the same reading
- **THEN** both surfaces SHALL report the same timestamp form
- **AND** a comparison between them SHALL reflect the actual instants

#### Scenario: The snapshot's latest timestamp reflects the true latest instant

- **WHEN** a snapshot is read from rows whose stored timestamps use different zone designators
- **THEN** the snapshot's latest timestamp SHALL be the one denoting the latest instant
- **AND** it SHALL NOT be decided by lexicographic string order

#### Scenario: An unparseable row does not displace a parseable one

- **WHEN** a snapshot contains both an unparseable timestamp and at least one parseable timestamp
- **THEN** the snapshot's latest timestamp SHALL be a parseable one
- **AND** the read SHALL NOT raise an error

<!-- @trace
source: repair-freshness-upload-and-playback-runtime-defects
updated: 2026-08-07
code:
  - docs/ops/workflow.md
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/app.ts
  - apps/server/src/metrics/metricTimestamp.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - packages/shared/src/managementAccess.ts
  - apps/server/src/metrics/liveMetrics.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/sw.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/routes/images.ts
  - docs/ops/conventions.md
tests:
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/metrics/metricTimestamp.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts
  - apps/web/src/sw.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/uploadsSecurityHeaders.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/metrics/liveMetrics.test.ts
-->