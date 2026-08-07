# management-socket-session-boundaries Specification

## Purpose

TBD - created by archiving change 'harden-management-read-surface-and-socket-boundaries'. Update Purpose after archive.

## Requirements

### Requirement: Classify socket sessions as playback-safe or management-trusted
The system SHALL classify each Socket.IO session at handshake time so the server can distinguish playback-safe listeners from trusted management listeners.

A playback-safe handshake that does not resolve a valid Display Client Context SHALL be classified as unidentified rather than rejected. An unidentified session SHALL be allowed to connect and SHALL receive only the allowlisted feeds that carry no Device identity and no Site Scope. An unidentified session SHALL NEVER be classified as management-trusted.

#### Scenario: Playback session connects without management credentials
- **WHEN** a socket client connects without a trusted management origin or valid management access token
- **THEN** the server SHALL classify that session as playback-safe
- **AND** it SHALL only receive the socket feeds allowed for playback-safe sessions

##### Example: Public playback display gets runtime-safe bootstrap only
- **GIVEN** a display runtime session connects from an untrusted non-management client
- **WHEN** the socket handshake completes
- **THEN** the server classifies the session as playback-safe
- **AND** the connection is not subscribed to management-only diagnostic events

#### Scenario: Handshake without a valid Device Credential is classified as unidentified

- **WHEN** a playback-safe handshake presents no Device Credential, or one that is revoked, disabled, or resolves to no Device
- **THEN** the server SHALL classify that session as unidentified
- **AND** the connection SHALL be established rather than refused

#### Scenario: Credential resolution failure fails toward fewer feeds

- **WHEN** resolving a Display Client Context raises an unexpected error during handshake
- **THEN** the server SHALL classify that session as unidentified
- **AND** the server SHALL NOT classify it as an identified session


<!-- @trace
source: narrow-display-socket-gate-to-identity-scoped-feeds
updated: 2026-08-08
code:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/app.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/server/src/routes/device.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/services/displayRuntimeSyncReporter.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/server/src/services/managementPasswordService.ts
  - apps/server/src/routes/management-auth.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/server/src/fastify.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/managementSessionService.ts
tests:
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
-->

---
### Requirement: Keep management-only socket events scoped to trusted sessions
The system SHALL emit management-only socket events only to trusted management sessions, while continuing to expose playback-safe events to both playback and management sessions.

#### Scenario: Sensitive diagnostic event is withheld from playback-safe sessions
- **WHEN** the server emits a management-only diagnostic event
- **THEN** only trusted management sessions SHALL receive it
- **AND** playback-safe sessions SHALL remain connected without receiving that event

##### Example: System error stays management-only
- **GIVEN** one trusted management session and one playback-safe session are connected
- **WHEN** the server emits a `system:error` notification
- **THEN** the trusted management session receives the notification
- **AND** the playback-safe session does not receive it

<!-- @trace
source: harden-management-read-surface-and-socket-boundaries
updated: 2026-05-22
code:
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/server.ts
  - packages/shared/src/managementAccess.ts
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - README.md
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - packages/shared/src/brandRuntime.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/services/displayOpsService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/server-startup.ts
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/app/router.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - docs/README.md
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - scripts/dev.test.mjs
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/fastify.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/app.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/server/src/routes/brand.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/server/src/routes/device.ts
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/services/socket.test.ts
-->

---
### Requirement: Restrict unidentified socket sessions to an explicit feed allowlist

The system SHALL deliver socket events to unidentified sessions only when the event appears on an explicit allowlist of feeds that carry no Device identity and no Site Scope. The allowlist SHALL contain the Server Time Signal. Every other broadcast SHALL be delivered only to identified sessions, so that adding a new broadcast without changing the allowlist SHALL NOT reach unidentified sessions.

An event emitted by an unidentified session that requires a Display Client Context SHALL be ignored without terminating that connection.

#### Scenario: Unidentified session receives only the allowlisted feed

- **WHEN** an unidentified session is connected and the server broadcasts its runtime feeds
- **THEN** the session SHALL receive the Server Time Signal
- **AND** the session SHALL NOT receive live metrics, circuit metrics, MQTT status, display sync, circuit settings updates, playback settings updates, image updates, or any management-only event

##### Example: Feed delivery by session class

| Feed | Unidentified | Identified playback-safe | Management-trusted |
| ---- | ------------ | ------------------------ | ------------------ |
| Server Time Signal | delivered | delivered | delivered |
| live metrics update | withheld | delivered | delivered |
| circuit metrics update | withheld | delivered | delivered |
| MQTT status | withheld | delivered | delivered |
| display sync | withheld | delivered | delivered |
| management-only diagnostics | withheld | withheld | delivered |

#### Scenario: A newly added broadcast does not reach unidentified sessions

- **WHEN** a new broadcast feed is added without being placed on the allowlist
- **THEN** unidentified sessions SHALL NOT receive it

#### Scenario: Identified sessions are unaffected

- **WHEN** a session presenting a valid Device Credential connects
- **THEN** it SHALL receive exactly the feeds it received before unidentified sessions were permitted to connect

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

<!-- @trace
source: narrow-display-socket-gate-to-identity-scoped-feeds
updated: 2026-08-08
code:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/app.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/server/src/routes/device.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/services/displayRuntimeSyncReporter.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/server/src/services/managementPasswordService.ts
  - apps/server/src/routes/management-auth.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/server/src/fastify.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/services/managementSessionService.ts
tests:
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
-->