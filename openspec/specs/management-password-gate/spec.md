# management-password-gate Specification

## Purpose

TBD - created by archiving change 'add-management-password-gate'. Update Purpose after archive.

## Requirements

### Requirement: Store the management password with a slow key derivation function

The system SHALL store the management password only as a derived hash produced by a slow key derivation function with a per-password random salt. The system SHALL NOT store, log, or return the plaintext password, the derived hash, or the salt to any caller. Password comparison SHALL use a constant-time equality check. The key derivation parameters SHALL be stored alongside the hash so that stored passwords remain verifiable after the parameters are changed.

#### Scenario: The same password produces different stored hashes

- **WHEN** the same password text is set twice, each time with a newly generated salt
- **THEN** the two stored hashes SHALL differ
- **AND** both SHALL verify successfully against that password text

#### Scenario: Stored secrets are never returned

- **WHEN** any management password endpoint returns a response
- **THEN** the response SHALL NOT contain the plaintext password, the derived hash, the salt, or a session token


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
### Requirement: Gate management access on a valid management session when enabled

When the management password gate is enabled, the system SHALL require both the existing management origin trust decision and a valid unexpired management session before granting management access. When the gate is disabled, the management access decision SHALL be identical to the decision made without this capability.

A request carrying a valid `MANAGEMENT_ACCESS_TOKEN` SHALL satisfy the password gate condition without a management session.

A request that fails the password gate SHALL receive the existing management access denied envelope and SHALL NOT receive any management payload. A missing session, an unparseable session, and an expired session SHALL be answered identically so the response does not reveal which case occurred.

#### Scenario: Gate disabled preserves existing behavior

- **WHEN** the management password gate is disabled and a trusted-origin caller requests a management route
- **THEN** the caller SHALL be granted management access exactly as before this capability existed

#### Scenario: Gate enabled denies a trusted origin without a session

- **WHEN** the management password gate is enabled and a trusted-origin caller without a management session requests a management route
- **THEN** the server SHALL return the management access denied envelope
- **AND** the response SHALL NOT include any management payload

#### Scenario: Gate enabled admits a trusted origin holding a valid session

- **WHEN** the management password gate is enabled and a trusted-origin caller presents a valid unexpired management session
- **THEN** the server SHALL grant management access

#### Scenario: Management access token satisfies the gate

- **WHEN** the management password gate is enabled and a caller presents a valid `MANAGEMENT_ACCESS_TOKEN`
- **THEN** the server SHALL grant management access without requiring a management session

##### Example: Management access decision by condition

| Gate enabled | Origin trusted | Valid session | Valid access token | Management access |
| ------------ | -------------- | ------------- | ------------------ | ----------------- |
| no | no | no | no | denied |
| no | yes | no | no | granted |
| yes | yes | no | no | denied |
| yes | yes | yes | no | granted |
| yes | no | yes | no | denied |
| yes | no | no | yes | granted |


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
### Requirement: Issue and revoke opaque management sessions

On successful password verification the system SHALL generate a high-entropy random session token, store only its hash with an explicit expiry, and deliver the token to the browser as an HttpOnly cookie. An expired session SHALL NOT grant management access.

Changing the password, disabling the gate, and recovering through the management access token SHALL each invalidate every existing management session.

#### Scenario: Expired session no longer grants access

- **WHEN** a management session has passed its expiry time and its holder requests a management route while the gate is enabled
- **THEN** the server SHALL deny management access

#### Scenario: Password change invalidates existing sessions

- **GIVEN** two browsers each hold a valid management session
- **WHEN** the password is changed from one of them
- **THEN** both sessions SHALL stop granting management access
- **AND** both browsers SHALL require unlocking again

#### Scenario: Locking clears the current session

- **WHEN** a caller with a valid management session requests to lock
- **THEN** the server SHALL invalidate that session and clear its cookie
- **AND** subsequent management requests from that browser SHALL be denied while the gate is enabled


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
### Requirement: Limit repeated password attempts

The system SHALL count consecutive failed password attempts on the server. Once the count reaches a fixed threshold, the system SHALL refuse unlock requests until a fixed cooldown has elapsed, including requests that carry the correct password. A successful unlock SHALL reset the count to zero.

#### Scenario: Threshold reached starts a cooldown

- **WHEN** consecutive failed password attempts reach the threshold
- **THEN** the system SHALL refuse further unlock attempts until the cooldown has elapsed
- **AND** the refusal SHALL report the locked state and the time at which it ends

#### Scenario: Correct password is refused during cooldown

- **WHEN** the correct password is submitted while the cooldown is in effect
- **THEN** the system SHALL refuse the unlock
- **AND** the system SHALL NOT issue a management session

#### Scenario: Successful unlock resets the counter

- **GIVEN** some failed attempts have been recorded but the threshold was not reached
- **WHEN** the correct password is submitted
- **THEN** the system SHALL issue a management session
- **AND** the consecutive failure count SHALL return to zero


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
### Requirement: Expose management password gate operations over an API

The system SHALL expose API operations that enable the gate with a new password, disable the gate, change the password, unlock, lock, and read the gate state. Enabling the gate SHALL require a new password in the same request. Changing the password from an unlocked session SHALL require the current password. A caller presenting a valid `MANAGEMENT_ACCESS_TOKEN` SHALL be able to reset the password or disable the gate without knowing the current password.

The gate state SHALL be readable without a management session so a caller can decide whether an unlock is required, and that state SHALL NOT include any stored secret or the failure count.

#### Scenario: Enabling without a new password is rejected

- **WHEN** a request enables the gate without providing a new password
- **THEN** the server SHALL reject the request
- **AND** the stored gate configuration SHALL remain unchanged

#### Scenario: Changing the password requires the current password

- **WHEN** an unlocked caller submits a new password without the correct current password
- **THEN** the server SHALL reject the request
- **AND** the stored password SHALL remain unchanged

#### Scenario: Management access token recovers a forgotten password

- **WHEN** a caller presenting a valid `MANAGEMENT_ACCESS_TOKEN` sets a new password or disables the gate without supplying the current password
- **THEN** the server SHALL apply the change
- **AND** every existing management session SHALL be invalidated

#### Scenario: Gate state is readable while locked

- **WHEN** a caller without a management session reads the gate state while the gate is enabled
- **THEN** the response SHALL report that the gate is enabled and that the caller is not authenticated
- **AND** the response SHALL NOT include the hash, the salt, a session token, or the failure count


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
### Requirement: Leave playback surfaces outside the management password gate

The management password gate SHALL NOT apply to playback display routes, the offline route, display client runtime APIs, or display client socket connections. Enabling the gate SHALL NOT change any playback behavior.

#### Scenario: Display client runtime stays available while the gate is enabled

- **WHEN** the management password gate is enabled and a paired display client requests its runtime data and establishes its socket connection
- **THEN** both SHALL succeed exactly as they do while the gate is disabled

#### Scenario: Playback routes render while the gate is enabled

- **WHEN** the management password gate is enabled and a playback display route is opened
- **THEN** the route SHALL render without presenting an unlock surface

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
### Requirement: Present an unlock surface in place of management content

When the gate is enabled and the browser holds no valid management session, the management shell SHALL render an unlock surface in place of management page content without changing the current URL. After a successful unlock the shell SHALL render the originally requested management page.

When the gate state cannot be read, the management shell SHALL render the unlock surface rather than management content, so that a read failure fails toward stricter access.

When any management API returns the management access denied envelope, the management shell SHALL return to the unlock surface rather than rendering blank or error content.

#### Scenario: Locked management route shows the unlock surface

- **WHEN** the gate is enabled, no valid session exists, and a management route is opened
- **THEN** the management shell SHALL render the unlock surface instead of the management page content
- **AND** the browser URL SHALL remain the requested management route

#### Scenario: Unlocking reveals the requested page

- **WHEN** the correct password is submitted from the unlock surface
- **THEN** the shell SHALL render the originally requested management page
- **AND** no route redirect SHALL occur

#### Scenario: Gate state read failure fails toward the unlock surface

- **WHEN** the management shell cannot read the gate state
- **THEN** it SHALL render the unlock surface
- **AND** it SHALL NOT render management page content

#### Scenario: Session lost mid-session returns to the unlock surface

- **WHEN** a management API returns the management access denied envelope while the operator is using a management page
- **THEN** the shell SHALL return to the unlock surface

#### Scenario: Gate disabled renders management content directly

- **WHEN** the gate is disabled and a management route is opened
- **THEN** the shell SHALL render the management page content without an unlock surface


<!-- @trace
source: add-management-unlock-surface
updated: 2026-08-08
code:
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/services/managementPasswordService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/server/src/routes/management-auth.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/fastify.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/managementSessionService.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/app.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
tests:
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
-->

---
### Requirement: Reflect server-owned lock state on the unlock surface

The unlock surface SHALL present the locked state and its end time using values returned by the server. It SHALL NOT count failed attempts in the browser and SHALL NOT decide locally whether a cooldown has elapsed. While locked, the unlock surface SHALL prevent submission. Failure feedback SHALL NOT indicate whether the submitted password was close to correct.

#### Scenario: Locked state disables submission

- **WHEN** the server reports that unlocking is locked until a given time
- **THEN** the unlock surface SHALL show the locked state and that time
- **AND** submission SHALL be prevented while locked

#### Scenario: Wrong password feedback reveals nothing

- **WHEN** an incorrect password is submitted and the server reports an authentication failure
- **THEN** the unlock surface SHALL report only that the password was incorrect


<!-- @trace
source: add-management-unlock-surface
updated: 2026-08-08
code:
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/services/managementPasswordService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/server/src/routes/management-auth.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/fastify.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/managementSessionService.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/app.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
tests:
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
-->

---
### Requirement: Operate the gate from a management security settings surface

The system SHALL provide a management settings page that enables the gate with a new password, disables the gate, and changes the password, by calling the management password gate API. The page SHALL prevent submission when enabling the gate without a new password, and when changing the password without the current password, and SHALL state which field is missing.

#### Scenario: Enabling without a new password cannot be submitted

- **WHEN** the operator enables the gate without entering a new password
- **THEN** the page SHALL prevent submission
- **AND** the page SHALL state that a new password is required

#### Scenario: Changing the password without the current password cannot be submitted

- **WHEN** the operator enters a new password without entering the current password
- **THEN** the page SHALL prevent submission
- **AND** the page SHALL state that the current password is required

#### Scenario: Operator enables the gate

- **WHEN** the operator enables the gate with a new password from the settings page
- **THEN** the gate SHALL become enabled
- **AND** subsequently opening a management route in a browser without a session SHALL present the unlock surface


<!-- @trace
source: add-management-unlock-surface
updated: 2026-08-08
code:
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/services/managementPasswordService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/server/src/routes/management-auth.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/fastify.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/managementSessionService.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/app.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
tests:
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
-->

---
### Requirement: Keep playback surfaces free of the unlock surface

Playback display routes and the offline route SHALL NOT render the unlock surface, regardless of whether the gate is enabled.

#### Scenario: Playback route renders while the gate is enabled

- **WHEN** the gate is enabled and a playback display route is opened
- **THEN** the route SHALL render its display content
- **AND** no unlock surface SHALL appear

<!-- @trace
source: add-management-unlock-surface
updated: 2026-08-08
code:
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/services/managementPasswordService.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/server/src/routes/management-auth.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/fastify.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/managementSessionService.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/app.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
tests:
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
-->