# management-api-access-boundaries Specification

## Purpose

TBD - created by archiving change 'harden-management-governance-and-api-boundaries'. Update Purpose after archive.

## Requirements

### Requirement: Protect management mutation APIs with a shared access boundary

The system SHALL protect management mutation APIs with a shared access boundary instead of exposing them to unrestricted cross-origin callers by default. When the management password gate is enabled, the shared access boundary SHALL additionally require a valid unexpired management session, or a valid `MANAGEMENT_ACCESS_TOKEN`, before granting access. A trusted origin alone SHALL NOT be sufficient while the gate is enabled. When the gate is disabled, the boundary SHALL continue to allow trusted management callers without a password session, but SHALL still reject untrusted callers. Password gate configuration mutations SHALL follow this boundary in both gate states. The pre-session management unlock endpoint SHALL require a trusted management origin, loopback caller, or valid `MANAGEMENT_ACCESS_TOKEN` before verifying a password or updating failed-attempt lockout state.

#### Scenario: Untrusted origin attempts a mutation

- **WHEN** an untrusted origin or unauthenticated client attempts to call a management mutation endpoint
- **THEN** the server rejects the request according to the configured management access policy
- **AND** read-only diagnostics remain independently configurable

##### Example: Cross-origin request cannot update MQTT settings

- **GIVEN** the management origin policy does not trust the caller
- **WHEN** the caller sends a `PUT` request to a settings mutation endpoint
- **THEN** the request is denied
- **AND** the server does not apply the mutation

#### Scenario: Trusted origin without a session cannot mutate while the gate is enabled

- **GIVEN** the management password gate is enabled
- **WHEN** a trusted-origin caller without a valid management session sends a management mutation request
- **THEN** the server SHALL deny the request with the management access denied envelope
- **AND** the server SHALL NOT apply the mutation

##### Example: Same-host browser cannot change playback settings while locked

- **GIVEN** the management password gate is enabled and the caller is a browser on the server host with no management session
- **WHEN** the caller sends a `PUT` request to a playback settings mutation endpoint
- **THEN** the request is denied
- **AND** the stored playback settings remain unchanged

#### Scenario: Untrusted caller cannot bootstrap a disabled password gate

- **GIVEN** the management password gate is disabled
- **WHEN** an untrusted origin or remote caller sends `PUT /api/management-auth/password` with `enabled: true`
- **THEN** the server returns the management access denied envelope
- **AND** the password gate remains disabled

#### Scenario: Trusted caller can bootstrap a disabled password gate

- **GIVEN** the management password gate is disabled
- **WHEN** a trusted same-host, configured-origin, or `MANAGEMENT_ACCESS_TOKEN` caller sends `PUT /api/management-auth/password` with a valid new password
- **THEN** the server enables the password gate
- **AND** the existing password configuration response is returned

#### Scenario: Untrusted unlock attempts do not consume administrator lockout slots

- **GIVEN** the management password gate is enabled and an untrusted caller has no valid management session
- **WHEN** that caller submits five incorrect passwords to `POST /api/management-auth/unlock`
- **THEN** each request is denied by the management access boundary before password verification
- **AND** a trusted same-host caller can immediately unlock with the correct password

#### Scenario: Trusted unlock retains existing failure responses

- **GIVEN** the management password gate is enabled and the caller is a trusted management origin
- **WHEN** the caller submits an incorrect password, or submits any password during cooldown
- **THEN** the server returns the existing 401 authentication-failed or 429 locked response


<!-- @trace
source: harden-management-unlock-origin-lockout
updated: 2026-08-08
code:
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/routes/management-auth.ts
  - apps/server/src/services/managementPasswordService.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/services/displayRuntimeSyncReporter.ts
  - apps/server/src/app.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/server/src/plugins/deviceContext.ts
  - apps/web/src/services/api.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/server/src/fastify.ts
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/managementSessionService.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/server/src/routes/device.ts
tests:
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
-->

---
### Requirement: Protect Device pairing administration with the management mutation boundary

Pairing Token issuance, credential revocation, and re-pair actions SHALL require the existing trusted management mutation classification. The public token exchange endpoint SHALL accept only the opaque token and SHALL NOT expose Device administration data.

#### Scenario: Untrusted caller issues a Pairing Token

- **WHEN** an untrusted remote or playback caller requests a Pairing Token
- **THEN** the system rejects the request with the existing management access denied envelope
- **AND** no token row is created

<!-- @trace
source: secure-device-pairing
updated: 2026-07-30
code:
  - apps/server/src/services/playbackProfileService.ts
  - packages/shared/src/deviceIdentity.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/services/deviceCredentialService.ts
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - packages/shared/src/deviceIdentity.contract.ts
  - .env.example
  - packages/shared/src/devicePairing.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/ops/conventions.md
  - docs/architecture/default-playback-profile.md
  - deploy/install-thin-kiosk.sh
  - apps/server/src/routes/device-pairing.ts
  - docs/ops/delegation.md
  - docs/ops/dispatch.md
  - apps/server/src/db/seed.ts
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/app.ts
  - AGENTS.md
  - apps/server/src/db/migrations/029_device_group_management.sql
  - CLAUDE.md
  - apps/server/src/routes/devices.ts
  - docs/agents/issue-tracker.md
  - deploy/verify-thin-kiosk.sh
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/index.ts
  - apps/server/src/services/deviceGroupService.ts
  - docs/ops/maintenance.md
  - apps/server/src/config.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - docs/ops/workflow.md
  - docs/ops/judgment.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
tests:
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/routes/device-group-management.test.ts
-->