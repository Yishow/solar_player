# device-fleet-management-surface Specification

## Purpose

TBD - created by archiving change 'device-fleet-management-surface'. Update Purpose after archive.

## Requirements

### Requirement: Manage Devices and Groups from one trusted surface

The management UI SHALL provide Device create, edit, enable, disable, and Group assignment actions, plus Group create, edit, enable, disable, Site Scope, and Default Profile assignment actions.

#### Scenario: Configure a new CL lobby Device

- **WHEN** a trusted manager creates Group CL Lobby with Site Scope cl and Default Profile, then creates Device cl-lobby-01 in that Group
- **THEN** the Device row displays the resolved Group, cl Site Scope, enabled state, and unpaired state


<!-- @trace
source: device-fleet-management-surface
updated: 2026-07-30
code:
  - .github/workflows/agent-source-artifact.yml
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/routes/devices.ts
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - CLAUDE.md
  - docs/ops/maintenance.md
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/fastify.ts
  - docs/agents/issue-tracker.md
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/routes/device-pairing.ts
  - docs/ops/judgment.md
  - apps/server/src/plugins/deviceContext.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayClientContext.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/app.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - apps/server/src/routes/device-groups.ts
  - docs/ops/conventions.md
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - packages/shared/src/devicePairing.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/app/routeMeta.ts
  - docs/ops/dispatch.md
  - apps/web/src/pages/DeviceFleet/route.ts
  - docs/ops/delegation.md
  - apps/server/src/services/deviceCredentialService.ts
  - deploy/install-thin-kiosk.sh
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/displayStoryService.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/index.ts
  - docs/ops/workflow.md
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/realtime/SocketService.ts
  - .env.example
  - scripts/fhd-witness-config.mjs
  - apps/web/src/services/api.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - docs/architecture/default-playback-profile.md
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - packages/shared/src/playback.ts
  - AGENTS.md
  - apps/server/src/db/seed.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
tests:
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
-->

---
### Requirement: Complete pairing actions without exposing credentials

The management UI SHALL display a Pairing URL and expiry only immediately after token creation. It SHALL clear the plaintext token when the pairing dialog closes and SHALL never display a Device Credential. Re-pair SHALL require confirmation that the prior credential is revoked after exchange.

#### Scenario: Close a newly created Pairing dialog

- **WHEN** the manager closes the dialog containing a Pairing URL
- **THEN** reopening the Device row does not reveal the prior token
- **AND** the manager must issue a new token to obtain another URL


<!-- @trace
source: device-fleet-management-surface
updated: 2026-07-30
code:
  - .github/workflows/agent-source-artifact.yml
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/routes/devices.ts
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - CLAUDE.md
  - docs/ops/maintenance.md
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/fastify.ts
  - docs/agents/issue-tracker.md
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/routes/device-pairing.ts
  - docs/ops/judgment.md
  - apps/server/src/plugins/deviceContext.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayClientContext.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/app.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - apps/server/src/routes/device-groups.ts
  - docs/ops/conventions.md
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - packages/shared/src/devicePairing.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/app/routeMeta.ts
  - docs/ops/dispatch.md
  - apps/web/src/pages/DeviceFleet/route.ts
  - docs/ops/delegation.md
  - apps/server/src/services/deviceCredentialService.ts
  - deploy/install-thin-kiosk.sh
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/displayStoryService.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/index.ts
  - docs/ops/workflow.md
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/realtime/SocketService.ts
  - .env.example
  - scripts/fhd-witness-config.mjs
  - apps/web/src/services/api.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - docs/architecture/default-playback-profile.md
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - packages/shared/src/playback.ts
  - AGENTS.md
  - apps/server/src/db/seed.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
tests:
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
-->

---
### Requirement: Present fleet status with explicit operational states

Each Device row SHALL display clientId, displayName, Group, Site Scope, pairing state, enabled state, last seen, route, page, playback state, connection count, and duplicate identity warning. Loading, empty, unpaired, disabled, offline, unavailable, and mutation failure SHALL remain distinguishable.

#### Scenario: Device is disabled while its last heartbeat remains visible

- **WHEN** a Device is disabled after a successful heartbeat
- **THEN** the row displays disabled as the formal playback state
- **AND** retains last seen, route, and page as historical diagnostics


<!-- @trace
source: device-fleet-management-surface
updated: 2026-07-30
code:
  - .github/workflows/agent-source-artifact.yml
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/routes/devices.ts
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - CLAUDE.md
  - docs/ops/maintenance.md
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/fastify.ts
  - docs/agents/issue-tracker.md
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/routes/device-pairing.ts
  - docs/ops/judgment.md
  - apps/server/src/plugins/deviceContext.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayClientContext.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/app.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - apps/server/src/routes/device-groups.ts
  - docs/ops/conventions.md
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - packages/shared/src/devicePairing.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/app/routeMeta.ts
  - docs/ops/dispatch.md
  - apps/web/src/pages/DeviceFleet/route.ts
  - docs/ops/delegation.md
  - apps/server/src/services/deviceCredentialService.ts
  - deploy/install-thin-kiosk.sh
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/displayStoryService.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/index.ts
  - docs/ops/workflow.md
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/realtime/SocketService.ts
  - .env.example
  - scripts/fhd-witness-config.mjs
  - apps/web/src/services/api.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - docs/architecture/default-playback-profile.md
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - packages/shared/src/playback.ts
  - AGENTS.md
  - apps/server/src/db/seed.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
tests:
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
-->

---
### Requirement: Keep management code out of playback sessions

The Device Fleet route SHALL load through the existing lazy ManagementShell boundary. A playback-only session SHALL NOT preload the fleet chunk or submit Device management requests.

#### Scenario: Playback route loads

- **WHEN** a Client opens a playback page without management trust
- **THEN** the Device Fleet module is not loaded
- **AND** no Device or Group management request is sent

<!-- @trace
source: device-fleet-management-surface
updated: 2026-07-30
code:
  - .github/workflows/agent-source-artifact.yml
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/routes/devices.ts
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - CLAUDE.md
  - docs/ops/maintenance.md
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/fastify.ts
  - docs/agents/issue-tracker.md
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/routes/device-pairing.ts
  - docs/ops/judgment.md
  - apps/server/src/plugins/deviceContext.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayClientContext.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/app.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - apps/server/src/routes/device-groups.ts
  - docs/ops/conventions.md
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - packages/shared/src/devicePairing.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/app/routeMeta.ts
  - docs/ops/dispatch.md
  - apps/web/src/pages/DeviceFleet/route.ts
  - docs/ops/delegation.md
  - apps/server/src/services/deviceCredentialService.ts
  - deploy/install-thin-kiosk.sh
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/displayStoryService.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/index.ts
  - docs/ops/workflow.md
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/realtime/SocketService.ts
  - .env.example
  - scripts/fhd-witness-config.mjs
  - apps/web/src/services/api.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - docs/architecture/default-playback-profile.md
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - packages/shared/src/playback.ts
  - AGENTS.md
  - apps/server/src/db/seed.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
tests:
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
-->