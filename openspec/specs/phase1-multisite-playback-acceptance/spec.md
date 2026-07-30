# phase1-multisite-playback-acceptance Specification

## Purpose

TBD - created by archiving change 'phase1-multisite-playback-acceptance'. Update Purpose after archive.

## Requirements

### Requirement: Verify fifty paired Clients through public seams

The Phase 1 acceptance harness SHALL create at least 50 Devices through Management APIs, pair them through token exchange, request authenticated Story and Rotation data, and connect their Sockets. At least 25 Devices SHALL use cl and at least 25 SHALL use kn. Heartbeat and Time Signal evidence SHALL be attributed per Client, and the harness SHALL fail when any connected Client is missing either signal, even when the aggregate count satisfies the cohort total.

#### Scenario: Run the full cohort

- **WHEN** the acceptance command runs against an isolated Server
- **THEN** all 50 Clients complete pairing, authenticated playback requests, heartbeat, and Time Signal receipt
- **AND** the command reports zero failures

#### Scenario: One Client never receives a Time Signal

- **WHEN** the cohort total of received Time Signals reaches the Client count but at least one connected Client received none
- **THEN** the acceptance command reports a failure naming the uncovered Client count
- **AND** the command exits non-zero

##### Example: aggregate total hides an uncovered Client

- **GIVEN** 50 connected Clients and 55 received Time Signals in total
- **WHEN** one Client accounts for 6 of them and one Client accounts for 0
- **THEN** the command fails because Time Signal coverage is 49 of 50, not because the total is below its minimum


<!-- @trace
source: repair-phase1-rotation-cache-and-acceptance-observability
updated: 2026-07-31
code:
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/config.ts
  - scripts/device-scoped-playback-load.test.mjs
  - AGENTS.md
  - docs/ops/conventions.md
  - scripts/device-scoped-playback-load.mjs
  - CLAUDE.md
  - docs/ops/device-scoped-playback-test-matrix.md
  - apps/server/src/routes/playback.ts
  - apps/server/src/services/displayRotationService.ts
tests:
  - apps/server/src/config.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
-->

---
### Requirement: Enforce bounded heartbeat, Time Signal, and rotation evaluation rates

Each connected Client SHALL emit at most one heartbeat per 10 seconds. The Server SHALL emit one immediate Time Signal and at most one periodic Signal per Client per 30 seconds. An unchanged Profile and Site cohort SHALL cause at most one full Effective Rotation evaluation per revision. This bound SHALL hold for cohorts served from a published Playback Profile Version as well as for cohorts served from the Default Profile, and every full Effective Rotation evaluation SHALL be counted in the evaluation counter that the acceptance seam reports. The harness SHALL sample the evaluation counter after a Profile Version is published and again after the steady-state window ends.

#### Scenario: Ten-minute steady-state run

- **WHEN** 50 Clients run for 10 minutes without a relevant revision change
- **THEN** the output remains within the heartbeat and Time Signal rates
- **AND** full rotation evaluation count grows by cohort revision, not by Device count
- **AND** retained active connection entries do not grow after reconnects settle

#### Scenario: Cohort served from a published Profile Version

- **WHEN** a Profile Version is published and every Client in one Site cohort requests playback runtime data without an intervening revision change
- **THEN** the reported Effective Rotation evaluation count grows by at most one for that cohort
- **AND** the acceptance command fails when the count instead grows once per request

##### Example: fifty runtime requests after publishing one Version

- **GIVEN** 25 kn Clients sharing one published Profile Version and an evaluation counter reading 4
- **WHEN** each of the 25 Clients requests playback runtime data once
- **THEN** the counter reads 5, not 29


<!-- @trace
source: repair-phase1-rotation-cache-and-acceptance-observability
updated: 2026-07-31
code:
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/config.ts
  - scripts/device-scoped-playback-load.test.mjs
  - AGENTS.md
  - docs/ops/conventions.md
  - scripts/device-scoped-playback-load.mjs
  - CLAUDE.md
  - docs/ops/device-scoped-playback-test-matrix.md
  - apps/server/src/routes/playback.ts
  - apps/server/src/services/displayRotationService.ts
tests:
  - apps/server/src/config.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
-->

---
### Requirement: Prove Site isolation and identity lifecycle end to end

The harness SHALL prove that CL and KN Clients sharing one Profile receive isolated Site data, and that unpaired, disabled, revoked, and re-paired Devices produce their specified public outcomes.

#### Scenario: Revoke and re-pair one Client during cohort playback

- **WHEN** one credential is revoked and its Device is paired again
- **THEN** the old credential fails closed
- **AND** the new credential resumes the same Group and Site-scoped playback
- **AND** other Clients remain unaffected

##### Example: Re-pair one KN Client without disturbing the cohort

- **GIVEN** 25 CL and 25 KN Clients are connected, including `phase1-kn-49`
- **WHEN** management revokes that Device, confirms the old credential returns `403 credential_revoked`, then issues and exchanges a new Pairing Token
- **THEN** the new credential returns the same Device, Group, and `kn` Site context from `/api/playback/runtime`
- **AND** the other 49 Clients remain connected


<!-- @trace
source: phase1-multisite-playback-acceptance
updated: 2026-07-30
code:
  - apps/web/src/hooks/useAppTime.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - scripts/deploy.test.mjs
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - docs/architecture/default-playback-profile.md
  - docs/ops/maintenance.md
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/services/deviceCredentialService.ts
  - scripts/capture-fhd-witness.mjs
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - docs/architecture/device-scoped-multisite-playback.md
  - apps/server/src/routes/device-pairing.ts
  - apps/server/src/realtime/serverTimeSignal.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/components/AppHeader.tsx
  - CLAUDE.md
  - apps/web/src/services/appTime.ts
  - packages/shared/src/devicePairing.ts
  - packages/shared/src/displayPageFreshness.ts
  - scripts/device-scoped-playback-load.mjs
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - AGENTS.md
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - deploy.md
  - .env.example
  - apps/web/src/pages/energyMonitoringState.ts
  - docs/ops/device-pairing-and-recovery.md
  - scripts/verify.test.mjs
  - packages/shared/src/displayClientLiveness.ts
  - package.json
  - packages/shared/src/playback.ts
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/routes/playback.ts
  - packages/shared/src/displayClientContext.ts
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceFleet/route.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/server/src/plugins/deviceContext.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/config.ts
  - docs/ops/conventions.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/routes/display-story.ts
  - deploy/install-thin-kiosk.sh
  - docs/ops/judgment.md
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - scripts/device-scoped-playback-load.test.mjs
  - docs/ops/delegation.md
  - apps/web/src/services/socket.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/hooks/playbackRouteSync.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - docs/architecture/server-app-time.md
  - scripts/fhd-witness-config.mjs
  - apps/server/src/app.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - docs/ops/device-scoped-playback-test-matrix.md
  - apps/server/src/fastify.ts
  - packages/shared/src/appTime.ts
  - apps/server/src/routes/devices.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/services/displayReadinessService.ts
  - docs/ops/dispatch.md
  - docs/ops/workflow.md
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/displayRotationService.ts
  - docs/agents/issue-tracker.md
tests:
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useAppTime.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/realtime/serverTimeSignal.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/web/src/services/appTime.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/playbackRouteSync.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
-->

---
### Requirement: Verify the installed thin-kiosk identity and time path

The thin-kiosk verifier SHALL read back the dedicated Firefox Profile, absence of private-window mode, Cookie persistence across Browser restart, remote Server reachability, immediate Time Signal, and Device/Time heartbeat fields.

#### Scenario: Installed kiosk lacks persistent identity

- **WHEN** the verifier cannot retain the Device Cookie across a controlled Browser restart
- **THEN** the verification fails with a named cookie-persistence check
- **AND** it does not report the kiosk as Phase 1 ready


<!-- @trace
source: phase1-multisite-playback-acceptance
updated: 2026-07-30
code:
  - apps/web/src/hooks/useAppTime.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - scripts/deploy.test.mjs
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - docs/architecture/default-playback-profile.md
  - docs/ops/maintenance.md
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/services/deviceCredentialService.ts
  - scripts/capture-fhd-witness.mjs
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - docs/architecture/device-scoped-multisite-playback.md
  - apps/server/src/routes/device-pairing.ts
  - apps/server/src/realtime/serverTimeSignal.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/components/AppHeader.tsx
  - CLAUDE.md
  - apps/web/src/services/appTime.ts
  - packages/shared/src/devicePairing.ts
  - packages/shared/src/displayPageFreshness.ts
  - scripts/device-scoped-playback-load.mjs
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - AGENTS.md
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - deploy.md
  - .env.example
  - apps/web/src/pages/energyMonitoringState.ts
  - docs/ops/device-pairing-and-recovery.md
  - scripts/verify.test.mjs
  - packages/shared/src/displayClientLiveness.ts
  - package.json
  - packages/shared/src/playback.ts
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/routes/playback.ts
  - packages/shared/src/displayClientContext.ts
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceFleet/route.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/server/src/plugins/deviceContext.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/config.ts
  - docs/ops/conventions.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/routes/display-story.ts
  - deploy/install-thin-kiosk.sh
  - docs/ops/judgment.md
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - scripts/device-scoped-playback-load.test.mjs
  - docs/ops/delegation.md
  - apps/web/src/services/socket.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/hooks/playbackRouteSync.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - docs/architecture/server-app-time.md
  - scripts/fhd-witness-config.mjs
  - apps/server/src/app.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - docs/ops/device-scoped-playback-test-matrix.md
  - apps/server/src/fastify.ts
  - packages/shared/src/appTime.ts
  - apps/server/src/routes/devices.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/services/displayReadinessService.ts
  - docs/ops/dispatch.md
  - docs/ops/workflow.md
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/displayRotationService.ts
  - docs/agents/issue-tracker.md
tests:
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useAppTime.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/realtime/serverTimeSignal.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/web/src/services/appTime.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/playbackRouteSync.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
-->

---
### Requirement: Produce durable Phase 1 handoff documentation

The repository SHALL document architecture vocabulary, migration and compatibility lifecycle, pairing and credential security, Site isolation, Server Time Signal, Windows Server and Pi thin-kiosk deployment, troubleshooting, and the 50-Client test matrix.

#### Scenario: Fresh operator follows the handoff

- **WHEN** an operator uses only the named runbooks to pair a kiosk, verify time, and diagnose an offline or disabled Device
- **THEN** each action identifies the exact command or management route and the expected observable result

##### Example: Diagnose a disabled thin kiosk after reboot

- **GIVEN** the operator has only the Phase 1 architecture, pairing/recovery runbook, deployment guide, and 50-Client matrix
- **WHEN** the kiosk read-back reports `device_disabled`
- **THEN** the handoff names the management route that re-enables the Device, the thin-kiosk verification command, and the expected paired identity, Time Signal, and heartbeat results

<!-- @trace
source: phase1-multisite-playback-acceptance
updated: 2026-07-30
code:
  - apps/web/src/hooks/useAppTime.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - scripts/deploy.test.mjs
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - docs/architecture/default-playback-profile.md
  - docs/ops/maintenance.md
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/services/deviceCredentialService.ts
  - scripts/capture-fhd-witness.mjs
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - docs/architecture/device-scoped-multisite-playback.md
  - apps/server/src/routes/device-pairing.ts
  - apps/server/src/realtime/serverTimeSignal.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/components/AppHeader.tsx
  - CLAUDE.md
  - apps/web/src/services/appTime.ts
  - packages/shared/src/devicePairing.ts
  - packages/shared/src/displayPageFreshness.ts
  - scripts/device-scoped-playback-load.mjs
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - AGENTS.md
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - deploy.md
  - .env.example
  - apps/web/src/pages/energyMonitoringState.ts
  - docs/ops/device-pairing-and-recovery.md
  - scripts/verify.test.mjs
  - packages/shared/src/displayClientLiveness.ts
  - package.json
  - packages/shared/src/playback.ts
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/routes/playback.ts
  - packages/shared/src/displayClientContext.ts
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceFleet/route.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/server/src/plugins/deviceContext.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/config.ts
  - docs/ops/conventions.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/routes/display-story.ts
  - deploy/install-thin-kiosk.sh
  - docs/ops/judgment.md
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - scripts/device-scoped-playback-load.test.mjs
  - docs/ops/delegation.md
  - apps/web/src/services/socket.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/hooks/playbackRouteSync.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - docs/architecture/server-app-time.md
  - scripts/fhd-witness-config.mjs
  - apps/server/src/app.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - docs/ops/device-scoped-playback-test-matrix.md
  - apps/server/src/fastify.ts
  - packages/shared/src/appTime.ts
  - apps/server/src/routes/devices.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/services/displayReadinessService.ts
  - docs/ops/dispatch.md
  - docs/ops/workflow.md
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/displayRotationService.ts
  - docs/agents/issue-tracker.md
tests:
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useAppTime.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/realtime/serverTimeSignal.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/web/src/services/appTime.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/playbackRouteSync.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
-->