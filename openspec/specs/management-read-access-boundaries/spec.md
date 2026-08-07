# management-read-access-boundaries Specification

## Purpose

TBD - created by archiving change 'harden-management-read-surface-and-socket-boundaries'. Update Purpose after archive.

## Requirements

### Requirement: Restrict management-only read routes to trusted operator callers

The system SHALL apply the management trusted-origin or access-token boundary to management-only read routes that expose operator settings, diagnostics, display ops, readiness details, or device metadata. When the management password gate is enabled, these routes SHALL additionally require a valid unexpired management session, or a valid `MANAGEMENT_ACCESS_TOKEN`. When the gate is disabled, these routes SHALL behave exactly as they did before the gate existed.

#### Scenario: Untrusted caller requests management diagnostics
- **WHEN** an untrusted non-loopback caller requests a management-only read route
- **THEN** the server SHALL return an explicit denied response
- **AND** it SHALL NOT expose the full management payload

##### Example: Untrusted request to display ops is denied
- **GIVEN** the request is not from loopback, does not match a trusted management origin, and does not include a valid management access token
- **WHEN** the caller requests `GET /api/display-ops`
- **THEN** the server returns a denied response
- **AND** the response does not include the display ops summary body

#### Scenario: Trusted caller without a session is denied while the gate is enabled

- **GIVEN** the management password gate is enabled
- **WHEN** a trusted-origin caller without a valid management session requests a management-only read route
- **THEN** the server SHALL return an explicit denied response
- **AND** it SHALL NOT expose the management payload


<!-- @trace
source: add-management-password-gate
updated: 2026-08-08
code:
  - apps/server/src/plugins/deviceContext.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/server/src/services/managementPasswordService.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/app.ts
  - apps/server/src/fastify.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/managementSessionService.ts
  - apps/server/src/routes/management-auth.ts
  - apps/server/src/routes/device.ts
tests:
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
-->

---
### Requirement: Preserve playback-safe runtime reads under hardened management boundaries

The system SHALL keep a playback-safe read contract for formal display runtime callers when the caller only needs active brand, MQTT connection status, or other runtime-safe bootstrap data. Enabling the management password gate SHALL NOT restrict these playback-safe reads.

#### Scenario: Playback runtime hydrates without management credentials
- **WHEN** a playback route loads its public runtime bootstrap data without management credentials
- **THEN** the runtime SHALL receive the minimal safe payload it needs
- **AND** the call SHALL NOT require a trusted management origin only to render the public playback surface

##### Example: Header brand bootstrap stays available
- **GIVEN** a playback page is rendering on a non-management display surface
- **WHEN** the header requests the active runtime brand payload
- **THEN** the API returns the active brand fields needed by the playback shell
- **AND** it does not expose the full management profile list

#### Scenario: Playback-safe reads survive an enabled password gate

- **GIVEN** the management password gate is enabled and the caller holds no management session
- **WHEN** a playback route loads its playback-safe runtime bootstrap data
- **THEN** the runtime SHALL receive the same payload it receives while the gate is disabled

<!-- @trace
source: add-management-password-gate
updated: 2026-08-08
code:
  - apps/server/src/plugins/deviceContext.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/server/src/services/managementPasswordService.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/app.ts
  - apps/server/src/fastify.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/managementSessionService.ts
  - apps/server/src/routes/management-auth.ts
  - apps/server/src/routes/device.ts
tests:
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
-->