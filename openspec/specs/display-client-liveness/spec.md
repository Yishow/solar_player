# display-client-liveness Specification

## Purpose

TBD - created by archiving change 'add-display-client-liveness-heartbeat'. Update Purpose after archive.

## Requirements

### Requirement: Display clients emit periodic liveness heartbeats

The playback shell SHALL emit a `client:heartbeat` event over the existing Socket.IO connection at a fixed interval while the playback shell is mounted. Each heartbeat SHALL carry the client session class, the current route path, the current playback page key (or null when none is active), the `isPlaying` flag, the `isIdle` flag, the viewport width and height, and the client-side ISO timestamp.

Each heartbeat SHALL additionally carry the display runtime sync state, the page key of the runtime source that reported it, the ISO timestamp of the last successful runtime sync, and the last runtime sync error message. The runtime sync state SHALL be one of `unknown`, `loading`, `synced`, or `degraded`. The error message SHALL be null whenever the state is `synced`. When no display runtime source has reported yet, the heartbeat SHALL carry state `unknown` with a null page key, null timestamp, and null error message.

#### Scenario: Heartbeat emitted on a fixed interval

- **WHEN** the playback shell has been mounted for longer than one heartbeat interval and the socket is connected
- **THEN** the client SHALL emit a `client:heartbeat` event carrying route path, current page key, `isPlaying`, `isIdle`, viewport size, and a client timestamp
- **AND** the event SHALL carry the display runtime sync state, reporting page key, last successful sync timestamp, and last error message

#### Scenario: Heartbeat emitted immediately on playback page change

- **WHEN** the active playback page key changes
- **THEN** the client SHALL emit a `client:heartbeat` event reflecting the new page key without waiting for the next interval tick

#### Scenario: No heartbeat while socket is disconnected

- **WHEN** the Socket.IO connection is not in the connected state
- **THEN** the client SHALL NOT emit `client:heartbeat` events until the connection is re-established
- **AND** the first heartbeat after reconnection SHALL carry the display runtime sync values current at that moment

#### Scenario: Invalid runtime sync state is treated as not reported

- **WHEN** the server receives a heartbeat whose runtime sync state is absent or not one of the four defined values
- **THEN** the server SHALL record the runtime sync state as `unknown` with a null page key, null timestamp, and null error message
- **AND** the server SHALL still accept and process the remaining heartbeat fields


<!-- @trace
source: relocate-display-runtime-sync-status-to-management
updated: 2026-08-08
code:
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
tests:
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
-->

---
### Requirement: Server maintains a per-client liveness registry

The server SHALL maintain an in-memory registry of connected display clients keyed by socket id. The registry SHALL record the session class, remote address, connected timestamp, last-seen timestamp, current route path, current page key, `isPlaying`, and `isIdle`. The registry SHALL update the matching entry on each received `client:heartbeat`, and SHALL remove the entry when the socket disconnects.

#### Scenario: Registry entry created on connection and updated on heartbeat

- **WHEN** a client connects and then sends a `client:heartbeat`
- **THEN** the registry SHALL contain one entry for that socket id with the heartbeat's route, page key, `isPlaying`, `isIdle`, and a refreshed last-seen timestamp

#### Scenario: Registry entry removed on disconnect

- **WHEN** a previously registered client disconnects
- **THEN** the registry SHALL no longer contain an entry for that socket id

#### Scenario: Heartbeat for an unknown socket is ignored safely

- **WHEN** a `client:heartbeat` arrives whose socket id has no registry entry
- **THEN** the server SHALL ignore the heartbeat without throwing


<!-- @trace
source: add-display-client-liveness-heartbeat
updated: 2026-05-23
code:
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/main.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/server/src/server-startup.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/tsconfig.json
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/package.json
  - apps/web/src/app/router.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/index.html
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/package.json
  - apps/server/src/config.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/routes/display-story.ts
  - packages/shared/src/displayStory.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/services/socket.ts
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - .env.example
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/services/displayRotationService.ts
  - AGENTS.md
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/pages/Overview/viewModel.ts
tests:
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/routes/playback.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/brand.test.ts
-->

---
### Requirement: Liveness state is derived from a configurable staleness window

The system SHALL classify each registered display client as `online`, `stale`, or `offline` using a pure function of the client's last-seen timestamp and the evaluation time. A client whose last-seen timestamp is within the staleness window SHALL be `online`; a connected client whose last-seen timestamp is older than the staleness window SHALL be `stale`; a client with no active connection SHALL be `offline`.

#### Scenario: Classify clients by last-seen age

- **WHEN** the liveness classifier evaluates a connected client
- **THEN** it SHALL return `online` if the last-seen age is within the staleness window and `stale` if the last-seen age exceeds it

##### Example: classification by last-seen age

| Last-seen age (s) | Connected | Staleness window (s) | Expected |
| ----------------- | --------- | -------------------- | -------- |
| 5                 | true      | 30                   | online   |
| 30                | true      | 30                   | online   |
| 45                | true      | 30                   | stale    |
| 45                | false     | 30                   | offline  |


<!-- @trace
source: add-display-client-liveness-heartbeat
updated: 2026-05-23
code:
  - apps/server/src/services/metricRetentionPlan.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/main.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/server/src/server-startup.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/tsconfig.json
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/package.json
  - apps/web/src/app/router.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/index.html
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/package.json
  - apps/server/src/config.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/routes/display-story.ts
  - packages/shared/src/displayStory.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/recovery/reloadController.ts
  - apps/web/src/services/socket.ts
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/hooks/useScreenWakeLock.ts
  - apps/web/src/hooks/screenWakeLock.ts
  - .env.example
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/services/displayRotationService.ts
  - AGENTS.md
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/pages/Overview/viewModel.ts
tests:
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/config.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - apps/server/src/routes/playback.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/brand.test.ts
-->

---
### Requirement: Device Status exposes display client liveness to management

The `GET /api/device/status` response `data` SHALL include a `displayClients` object containing the list of registered clients with their derived liveness state and a summary count of `online`, `stale`, and `offline` clients. This data SHALL only be returned to trusted management requests, consistent with the existing Device Status access boundary.

Each client entry SHALL include the display runtime sync state, the reporting runtime source page key, the last successful runtime sync timestamp, and the last runtime sync error message. The `Device Status` management surface SHALL render the runtime sync state and the last successful sync timestamp for each client alongside the existing per-client fields, and SHALL render an explicit not-reported indication rather than a blank value when the state is `unknown`.

Because heartbeats are emitted only by clients that pass socket identity authentication, this list SHALL NOT be read as covering every display machine. The `Device Status` management surface SHALL state that the display client list covers only paired, connected clients, so that an absent machine is not mistaken for a healthy one.

#### Scenario: Trusted management request receives display client liveness

- **WHEN** a trusted management client requests `GET /api/device/status`
- **THEN** the response `data.displayClients` SHALL include each registered client's page key, `isPlaying`, last-seen timestamp, and derived liveness state, plus a summary count by state
- **AND** each client entry SHALL include the display runtime sync state, reporting page key, last successful sync timestamp, and last error message

#### Scenario: Untrusted request is denied before liveness data is returned

- **WHEN** an untrusted request calls `GET /api/device/status`
- **THEN** the server SHALL return the management access denied response and SHALL NOT include `displayClients` data

#### Scenario: Device Status renders runtime sync state per client

- **WHEN** a trusted operator views the `Device Status` page and display clients are registered
- **THEN** each client row SHALL show the display runtime sync state and the last successful runtime sync timestamp
- **AND** a client that has never reported runtime sync SHALL show an explicit not-reported indication instead of a blank value

##### Example: Rendered runtime sync state per client

| Runtime sync state | Last successful sync timestamp | Rendered state | Rendered timestamp |
| ------------------ | ------------------------------ | -------------- | ------------------ |
| `unknown` | null | not reported | not reported |
| `loading` | null | syncing | not reported |
| `synced` | an ISO timestamp | synced | that timestamp, formatted |
| `degraded` | an earlier ISO timestamp | sync failed | that earlier timestamp, formatted |
| `degraded` | null | sync failed | not reported |

#### Scenario: Display client list states its coverage boundary

- **WHEN** a trusted operator views the `Device Status` display client section
- **THEN** the surface SHALL state that the list covers only paired, connected clients
- **AND** an unpaired display machine SHALL NOT appear in the list

##### Example: Unpaired machine is absent, not healthy

- **GIVEN** one paired client is reporting normally and one display machine has no Device Credential
- **WHEN** the operator reads the display client section
- **THEN** only the paired client appears
- **AND** the stated coverage boundary tells the operator that absence does not imply health


<!-- @trace
source: relocate-display-runtime-sync-status-to-management
updated: 2026-08-08
code:
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
tests:
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
-->

---
### Requirement: Server-authenticated Device Identity owns liveness state

Display Client liveness SHALL use the Device Identity established during Socket authentication. Socket ID SHALL identify only a child connection, and client-supplied identity fields SHALL NOT create or select a Device entry.

#### Scenario: Heartbeat claims another clientId

- **WHEN** an authenticated Device heartbeat includes a clientId different from its credential-bound Device
- **THEN** the Server ignores the claimed identity
- **AND** updates only the credential-bound Device or rejects the invalid payload

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
### Requirement: Report Time Sync State in Device heartbeats

Each Device heartbeat SHALL include exactly one Time Sync State: waiting, synced, stale, or time-untrusted. The Server SHALL expose that state in the Device liveness snapshot.

#### Scenario: Client crosses the stale threshold

- **WHEN** the Client has not received a Time Signal for 90000 milliseconds
- **THEN** its next heartbeat reports stale
- **AND** Device Status can distinguish stale from disconnected

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
### Requirement: Carry Profile rollout state in Device heartbeats

Device heartbeats SHALL include desiredVersion, appliedVersion, and updateState after Profile rollout is enabled. The liveness snapshot SHALL retain the last valid rollout state for offline diagnostics.

#### Scenario: Device goes offline while waiting

- **WHEN** a Device last reports waiting and then becomes offline
- **THEN** management shows offline as liveness and preserves waiting as the last rollout state
- **AND** it does not count the Device as applied

##### Example: Waiting Version 8 loses its connection

- **GIVEN** a Device reports desiredVersion=8, appliedVersion=7, and updateState=waiting
- **WHEN** its connected count reaches zero
- **THEN** management classifies its liveness as offline
- **AND** retains appliedVersion=7 and the last waiting state for diagnostics

<!-- @trace
source: device-profile-rollout-observability
updated: 2026-07-30
code:
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/server/src/services/playbackProfileGovernanceService.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/index.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - apps/server/src/routes/display-story.ts
  - apps/web/src/pages/Overview/index.tsx
  - deploy/install-thin-kiosk.sh
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - docs/architecture/device-scoped-multisite-playback.md
  - docs/architecture/default-playback-profile.md
  - apps/server/src/services/displayRotationService.ts
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - packages/shared/src/devicePairing.ts
  - apps/server/src/db/migrations/031_playback_profile_versions.sql
  - .env.example
  - packages/shared/src/appTime.ts
  - .scratch/device-scoped-multisite-playback/spec.md
  - docs/ops/delegation.md
  - apps/server/src/routes/devices.ts
  - deploy/verify-thin-kiosk.sh
  - deploy/stop-solar-kiosk.sh
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - docs/ops/conventions.md
  - apps/web/src/app/router.tsx
  - scripts/fhd-witness-config.mjs
  - scripts/device-scoped-playback-load.mjs
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - scripts/deploy.test.mjs
  - apps/web/src/hooks/playbackRouteSync.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - packages/shared/src/deviceProfileRollout.ts
  - apps/server/src/services/playbackProfileService.ts
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/PlaybackProfiles/index.tsx
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - packages/shared/src/displayClientContext.ts
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - CLAUDE.md
  - packages/shared/src/playbackProfileVersion.ts
  - apps/web/src/pages/PlaybackProfiles/PlaybackProfilesContent.tsx
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/services/deviceCredentialService.ts
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/config.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/PlaybackProfiles/viewModel.ts
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/displayClientContextService.ts
  - docs/agents/issue-tracker.md
  - packages/shared/src/displayClientLiveness.ts
  - packages/shared/src/playback.ts
  - apps/web/src/app/routeMeta.ts
  - deploy.md
  - apps/web/src/services/profileRollout.ts
  - apps/server/src/fastify.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/services/displayReadinessService.ts
  - .github/workflows/agent-source-artifact.yml
  - docs/ops/workflow.md
  - apps/server/src/db/migrations/029_device_group_management.sql
  - docs/ops/judgment.md
  - scripts/device-scoped-playback-load.test.mjs
  - apps/web/src/hooks/useAppTime.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/services/appTime.ts
  - docs/ops/dispatch.md
  - apps/server/src/routes/playback-profiles.ts
  - apps/web/src/pages/DeviceFleet/route.ts
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/services/deviceProfileRolloutService.ts
  - apps/web/src/pages/PlaybackProfiles/playbackProfiles.css
  - docs/ops/device-pairing-and-recovery.md
  - apps/server/src/app.ts
  - apps/server/src/routes/sustainability-story.ts
  - docs/ops/device-scoped-playback-test-matrix.md
  - apps/server/src/realtime/SocketService.ts
  - scripts/verify.test.mjs
  - apps/server/src/db/migrations/032_device_profile_rollout.sql
  - apps/server/src/services/deviceGroupService.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - package.json
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - docs/architecture/server-app-time.md
  - apps/web/src/pages/PlaybackProfiles/PlaybackProfilePreviewPanel.tsx
  - docs/ops/maintenance.md
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.ts
  - apps/server/src/realtime/serverTimeSignal.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/server/src/services/effectiveRotationCache.ts
  - AGENTS.md
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - apps/server/src/routes/playback.ts
  - deploy/start-solar-kiosk.sh
  - apps/server/src/routes/device-pairing.ts
tests:
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/hooks/playbackRouteSync.test.ts
  - apps/web/src/services/profileRollout.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/routes/playback-profiles.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/realtime/serverTimeSignal.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/pages/PlaybackProfiles/index.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/playbackProfileGovernanceService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/web/src/pages/PlaybackProfiles/viewModel.test.ts
  - apps/server/src/services/deviceProfileRolloutService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/services/appTime.test.ts
  - apps/web/src/hooks/useAppTime.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/device-group-management.test.ts
-->

---
### Requirement: Expose unpaired display access to management

The `GET /api/device/status` response `data` SHALL include an unpaired display access summary alongside `displayClients`. The summary SHALL contain a count per Display Client Context error code, a total count, the first and most recent occurrence timestamps, and the most recently denied route path. It SHALL be returned only to trusted management requests, consistent with the existing Device Status access boundary.

The summary SHALL NOT contain a client IP address, a User-Agent string, a cookie value, or any other network identifier. The denied route SHALL record the request path only, without its query string.

The set of counted keys SHALL remain bounded to the known Display Client Context error codes, so the summary's memory footprint does not grow with the number of access attempts.

#### Scenario: Unpaired access is counted without affecting display clients

- **WHEN** a client without a valid Device Credential requests a display runtime route and is denied
- **THEN** the unpaired display access summary SHALL increase the count for that error code and the total count
- **AND** the most recent occurrence timestamp and denied route SHALL be updated
- **AND** `data.displayClients` and its summary counts SHALL be unchanged

#### Scenario: Untrusted request receives no unpaired access summary

- **WHEN** an untrusted request calls `GET /api/device/status`
- **THEN** the server SHALL return the management access denied response
- **AND** the response SHALL NOT include the unpaired display access summary

#### Scenario: Summary carries no network identifiers

- **WHEN** the unpaired display access summary is serialized into the response
- **THEN** it SHALL NOT contain a client IP address, a User-Agent string, or a cookie value

#### Scenario: Unknown error codes do not grow the key set

- **WHEN** a denial carries an error code outside the known Display Client Context error codes
- **THEN** the total count SHALL increase
- **AND** the per-code key set SHALL NOT gain a new key

##### Example: Summary state before and after denials

| Situation | totalCount | firstSeenAt | lastDeniedRoute |
| --------- | ---------- | ----------- | --------------- |
| no unpaired access has occurred | 0 | null | null |
| one `device_unpaired` denial on the overview story route | 1 | that denial's timestamp | that route path |
| a second denial on the playback runtime route | 2 | unchanged from the first | the playback runtime route path |


<!-- @trace
source: surface-unpaired-display-access-in-management
updated: 2026-08-08
code:
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/services/managementSessionService.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/server/src/app.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/routes/management-auth.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/server/src/services/managementPasswordService.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/server/src/fastify.ts
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/server/src/realtime/SocketService.ts
tests:
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Render unpaired display access on Device Status

The `Device Status` management surface SHALL render the unpaired display access summary near the display client section, showing the total count, the most recent occurrence time, and the most recently denied route. When the total count is zero, the surface SHALL explicitly state that no unpaired access has occurred rather than hiding the section, so that "no problem" is distinguishable from "not yet loaded".

#### Scenario: Operator sees ongoing unpaired access

- **WHEN** a trusted operator views `Device Status` while unpaired access has been recorded
- **THEN** the surface SHALL show the total count, the most recent occurrence time, and the most recently denied route

#### Scenario: Zero state is stated explicitly

- **WHEN** a trusted operator views `Device Status` and no unpaired access has been recorded
- **THEN** the surface SHALL state that no unpaired access has occurred
- **AND** the section SHALL NOT be hidden

<!-- @trace
source: surface-unpaired-display-access-in-management
updated: 2026-08-08
code:
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/services/managementSessionService.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/server/src/app.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/routes/management-auth.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/server/src/services/managementPasswordService.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/server/src/fastify.ts
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/server/src/realtime/SocketService.ts
tests:
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->