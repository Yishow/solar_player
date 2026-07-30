# secure-device-pairing Specification

## Purpose

TBD - created by archiving change 'secure-device-pairing'. Update Purpose after archive.

## Requirements

### Requirement: Issue short-lived single-use Pairing Tokens

A trusted management caller SHALL be able to issue a Pairing Token for an existing Device. The token SHALL expire 15 minutes after issuance, SHALL be consumable once, SHALL appear in plaintext only in the creation response, and SHALL be stored only as a SHA-256 hash.

#### Scenario: Consume a valid token once

- **WHEN** a Client exchanges a valid unexpired unused token for its target Device
- **THEN** the system marks the token used and issues exactly one Device Credential
- **AND** a second exchange of the same token returns 409 with code pairing_token_used

##### Example: token boundary states

| Token state | Exchange result |
| --- | --- |
| unused and age 14 minutes 59 seconds | credential issued |
| unused and age 15 minutes | pairing_token_expired |
| used | pairing_token_used |
| unknown token hash | pairing_token_invalid |

#### Scenario: Open the one-time browser pairing path

- **WHEN** a thin kiosk opens the issued `/device-pairing#token=<token>` path
- **THEN** the URL fragment SHALL NOT be sent in the HTTP request, Server log, or Referer
- **AND** the landing page SHALL clear the fragment before exchanging the token through the same-origin POST endpoint
- **AND** a successful exchange SHALL redirect the Browser to `/overview`


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

---
### Requirement: Store and deliver opaque Device Credentials safely

A Device Credential SHALL be an opaque secret stored only as a SHA-256 hash. A successful exchange SHALL set cookie solar_device_credential with HttpOnly, SameSite=Lax, Path=/, and Max-Age=31536000. Remote exchange SHALL require HTTPS and set Secure; plain HTTP exchange SHALL be allowed only from loopback development requests. When TLS terminates at a reverse proxy, Server SHALL trust forwarded protocol only from explicitly configured proxy IPs.

#### Scenario: Browser JavaScript receives the exchange response

- **WHEN** a Client successfully exchanges a Pairing Token
- **THEN** the response body and logs SHALL NOT contain the Device Credential
- **AND** the credential SHALL be available only through the HttpOnly cookie

#### Scenario: Remote Browser exchanges through a trusted HTTPS proxy

- **WHEN** a remote Browser exchanges through an explicitly trusted proxy that reports HTTPS
- **THEN** the exchange succeeds and the Device Credential Cookie has Secure
- **AND** an untrusted caller cannot spoof forwarded HTTPS
- **AND** remote plain HTTP returns pairing_https_required without consuming the token


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

---
### Requirement: Revalidate and revoke credentials

Every authenticated Device context SHALL validate the credential hash, expiry, revocation state, Device enabled state, and Group enabled state. Successful re-pairing SHALL revoke the previously active credential before the new credential becomes active.

#### Scenario: Read back the paired Device identity

- **WHEN** a paired Browser requests the Device pairing status with its HttpOnly Cookie
- **THEN** the system returns paired, deviceId, and clientId for that Device only
- **AND** a missing Cookie returns credential_missing without falling back to an anonymous Device
- **AND** success and error responses set Cache-Control no-store

#### Scenario: Disabled Device presents an otherwise valid credential

- **WHEN** a disabled Device sends a request with an unexpired unrevoked credential
- **THEN** the system rejects formal playback context with code device_disabled

#### Scenario: Stored expiry is malformed

- **WHEN** a stored Pairing Token or Device Credential expiry cannot be parsed
- **THEN** validation fails closed as expired instead of granting an unbounded lifetime

#### Scenario: Re-pair a Device

- **WHEN** a new Pairing Token for a Device is exchanged successfully
- **THEN** the prior credential SHALL fail subsequent authentication
- **AND** the newly issued credential SHALL authenticate the Device

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