# server-authoritative-app-time Specification

## Purpose

TBD - created by archiving change 'server-authoritative-app-time'. Update Purpose after archive.

## Requirements

### Requirement: Broadcast an ordered Server Time Signal

Each Server process SHALL create a new instanceId and sequence starting at 1. It SHALL emit server:time immediately after a Client connects and every 30000 milliseconds thereafter with instanceId, sequence, epochMs, timeZone=Asia/Taipei, and broadcastIntervalMs=30000.

#### Scenario: Client connects to a running Server

- **WHEN** a display Client establishes its Socket connection
- **THEN** it receives one Server Time Signal without waiting for the periodic interval
- **AND** later signals from that process have strictly increasing sequence values


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

---
### Requirement: Derive App Time from monotonic elapsed time

A Client SHALL accept only a larger sequence for the same instanceId and SHALL accept a new baseline when instanceId changes. It SHALL compute App Time from the accepted epochMs plus performance monotonic elapsed time, not from the Client OS Clock.

#### Scenario: Duplicate and out-of-order signals arrive

- **WHEN** a Client has accepted sequence 8 and later receives sequence 8 or 7 for the same instanceId
- **THEN** it ignores those signals
- **AND** its App Time does not move backward

#### Scenario: Server restarts with a corrected Clock

- **WHEN** a Signal arrives with a new instanceId and sequence 1
- **THEN** the Client accepts the new epoch as its baseline even when it is earlier than the prior computed App Time


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

---
### Requirement: Expose deterministic Time Sync states

The Client SHALL report waiting before any valid Signal, synced until 90000 milliseconds after the last Signal, stale from 90000 milliseconds until 1800000 milliseconds, and time-untrusted at 1800000 milliseconds or later.

#### Scenario: Time state crosses exact boundaries

- **WHEN** state is computed from the last valid Signal
- **THEN** it matches the boundary table

##### Example: state boundaries

| Signal history | Elapsed | State |
| --- | ---: | --- |
| none | any | waiting |
| valid | 89999 ms | synced |
| valid | 90000 ms | stale |
| valid | 1799999 ms | stale |
| valid | 1800000 ms | time-untrusted |


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

---
### Requirement: Freeze absolute-time behavior when time is untrusted

In waiting and time-untrusted states, the Client SHALL freeze schedule transitions, freshness escalation, and data age calculation. Relative page duration, Autoplay, and Loop SHALL continue from monotonic elapsed time.

#### Scenario: Client starts offline without a Time Signal

- **WHEN** cached playback content is available but no valid Server Time Signal has been received
- **THEN** relative page rotation continues
- **AND** no absolute schedule transition or freshness age increment occurs


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

---
### Requirement: Apply recovered absolute-time results at a Safe Playback Boundary

After synchronization recovers, the Client SHALL update its internal App Time immediately and SHALL defer schedule or rotation results that alter the visible page until a Safe Playback Boundary.

#### Scenario: Recovery changes the active schedule

- **WHEN** a recovered Signal makes the current page out of schedule
- **THEN** the Client leaves the page at the next transition tick
- **AND** it does not reload in the middle of the current render frame

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