# identity-aware-display-client-liveness Specification

## Purpose

TBD - created by archiving change 'identity-aware-display-client-liveness'. Update Purpose after archive.

## Requirements

### Requirement: Aggregate Socket Connections under a stable Device Identity

The Server SHALL authenticate each display Socket with the Device Credential and SHALL maintain liveness by Device Identity with zero or more child connections. A heartbeat SHALL NOT be able to replace the authenticated identity.

#### Scenario: One Device reconnects before the old Socket closes

- **WHEN** the same valid credential creates a second same-source connection
- **THEN** both connections appear under one Device
- **AND** the latest valid heartbeat supplies the Device's current route, page, and playback state

#### Scenario: One child connection disconnects

- **WHEN** one of two active connections for a Device disconnects
- **THEN** the remaining connection keeps the Device online
- **AND** the Device summary retains its last valid state


<!-- @trace
source: identity-aware-display-client-liveness
updated: 2026-07-30
code:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/services/displayRotationService.ts
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/fastify.ts
  - apps/server/src/routes/device-pairing.ts
  - AGENTS.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - CLAUDE.md
  - apps/server/src/routes/devices.ts
  - scripts/capture-fhd-witness.mjs
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/server/src/services/sustainabilityStoryService.ts
  - docs/ops/workflow.md
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/routes/playback.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/ops/delegation.md
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - docs/architecture/default-playback-profile.md
  - apps/server/src/config.ts
  - scripts/fhd-witness-config.mjs
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/deviceIdentity.ts
  - deploy/install-thin-kiosk.sh
  - apps/server/src/services/displayStoryService.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - apps/server/src/services/deviceCredentialService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/db/seed.ts
  - docs/ops/dispatch.md
  - .env.example
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/services/playbackProfileService.ts
  - docs/ops/judgment.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - packages/shared/src/index.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - packages/shared/src/playback.ts
  - packages/shared/src/devicePairing.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/services/displayClientContextService.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/app.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/routes/sustainability-story.ts
  - docs/ops/maintenance.md
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/services/displayReadinessService.ts
  - docs/ops/conventions.md
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/services/socket.ts
  - packages/shared/src/displayClientContext.ts
  - apps/web/src/services/api.ts
tests:
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/services/socket.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
-->

---
### Requirement: Detect sustained duplicate identity across sources

The Server SHALL set duplicateIdentity=true when the same credential has active connections from different normalized source fingerprints for at least 30 seconds. Same-source reconnects SHALL NOT trigger the warning.

#### Scenario: Different-source overlap crosses the threshold

- **WHEN** two different-source connections for one credential remain active for 30 seconds
- **THEN** the Device liveness summary reports duplicateIdentity=true
- **AND** it records the duplicate detection time without exposing the credential

##### Example: duplicate warning boundaries

| Connections | Overlap | Warning |
| --- | --- | --- |
| same source | 60 seconds | false |
| different sources | 29.999 seconds | false |
| different sources | 30 seconds | true |


<!-- @trace
source: identity-aware-display-client-liveness
updated: 2026-07-30
code:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/services/displayRotationService.ts
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/fastify.ts
  - apps/server/src/routes/device-pairing.ts
  - AGENTS.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - CLAUDE.md
  - apps/server/src/routes/devices.ts
  - scripts/capture-fhd-witness.mjs
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/server/src/services/sustainabilityStoryService.ts
  - docs/ops/workflow.md
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/routes/playback.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/ops/delegation.md
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - docs/architecture/default-playback-profile.md
  - apps/server/src/config.ts
  - scripts/fhd-witness-config.mjs
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/deviceIdentity.ts
  - deploy/install-thin-kiosk.sh
  - apps/server/src/services/displayStoryService.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - apps/server/src/services/deviceCredentialService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/db/seed.ts
  - docs/ops/dispatch.md
  - .env.example
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/services/playbackProfileService.ts
  - docs/ops/judgment.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - packages/shared/src/index.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - packages/shared/src/playback.ts
  - packages/shared/src/devicePairing.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/services/displayClientContextService.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/app.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/routes/sustainability-story.ts
  - docs/ops/maintenance.md
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/services/displayReadinessService.ts
  - docs/ops/conventions.md
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/services/socket.ts
  - packages/shared/src/displayClientContext.ts
  - apps/web/src/services/api.ts
tests:
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/services/socket.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
-->

---
### Requirement: Reject invalid identity and heartbeat payloads safely

An invalid or revoked credential SHALL NOT create a Device registry entry. An invalid heartbeat payload from an authenticated connection SHALL be ignored without replacing the previous valid state.

A heartbeat received from an unidentified session SHALL be discarded. It SHALL NOT create a Device registry entry, SHALL NOT update any existing entry, and SHALL NOT change the derived liveness state of any Device.

#### Scenario: Credential is revoked while connected

- **WHEN** the Client sends its next heartbeat after credential revocation
- **THEN** the Server rejects and disconnects the Socket
- **AND** other valid Device connections remain unaffected

#### Scenario: Heartbeat from an unidentified session is discarded

- **WHEN** an unidentified session emits a heartbeat
- **THEN** the Server SHALL discard it without creating or updating a Device registry entry
- **AND** the session SHALL remain connected

##### Example: Unpaired browser never appears in Device Status

- **GIVEN** a browser without a Device Credential has an unidentified session and emits heartbeats
- **WHEN** a trusted operator reads the display client liveness data
- **THEN** that browser SHALL NOT appear among the listed clients
- **AND** the summary counts SHALL be unchanged by its heartbeats

<!-- @trace
source: narrow-display-socket-gate-to-identity-scoped-feeds
updated: 2026-08-07
code:
  - apps/web/src/sw.ts
  - apps/server/src/metrics/metricTimestamp.ts
  - apps/server/src/routes/imagesSupport.ts
  - docs/ops/workflow.md
  - apps/server/src/realtime/SocketService.ts
  - docs/ops/conventions.md
  - apps/server/src/metrics/liveMetrics.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/app.ts
  - packages/shared/src/managementAccess.ts
  - apps/server/src/routes/images.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
tests:
  - apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/metrics/metricTimestamp.test.ts
  - apps/server/src/routes/uploadsSecurityHeaders.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/sw.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/images.test.ts
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/metrics/liveMetrics.test.ts
-->