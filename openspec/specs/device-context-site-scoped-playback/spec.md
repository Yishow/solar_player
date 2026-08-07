# device-context-site-scoped-playback Specification

## Purpose

TBD - created by archiving change 'device-context-site-scoped-playback'. Update Purpose after archive.

## Requirements

### Requirement: Resolve a trusted Display Client Context

Formal playback requests SHALL resolve Device, Group, Site Scope, Playback Profile, and contextRevision from a valid Device Credential. Runtime routes SHALL NOT accept query parameters, custom headers, or Client state as authoritative Site Scope.

#### Scenario: Paired CL Device requests playback context

- **WHEN** an enabled paired Device in an enabled cl Group requests formal playback data
- **THEN** the system resolves a Context containing that Device, Group, cl Site Scope, assigned Profile, and contextRevision

#### Scenario: Client declares a different Site Scope

- **WHEN** a kn Device supplies a query parameter or header claiming cl
- **THEN** the system ignores the claim
- **AND** all formal playback data remains scoped to kn


<!-- @trace
source: device-context-site-scoped-playback
updated: 2026-07-30
code:
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/deviceIdentity.ts
  - packages/shared/src/displayReadiness.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/routes/playback.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - docs/ops/workflow.md
  - apps/server/src/app.ts
  - docs/ops/maintenance.md
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/index.ts
  - apps/server/src/fastify.ts
  - scripts/fhd-witness-config.mjs
  - packages/shared/src/playback.ts
  - apps/server/src/routes/display-readiness.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/services/playbackProfileService.ts
  - packages/shared/src/displayClientContext.ts
  - .env.example
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - CLAUDE.md
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/devicePairing.ts
  - apps/server/src/services/deviceCredentialService.ts
  - docs/ops/conventions.md
  - deploy/install-thin-kiosk.sh
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/config.ts
  - docs/architecture/default-playback-profile.md
  - scripts/deploy.test.mjs
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/ops/delegation.md
  - apps/server/src/routes/device-groups.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/routes/devices.ts
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/services/displayStoryService.ts
  - AGENTS.md
  - scripts/capture-fhd-witness.mjs
  - .scratch/device-scoped-multisite-playback/spec.md
tests:
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Fail closed when Device context is unavailable

The system SHALL return explicit unpaired, revoked, disabled, group-disabled, group-missing, or profile-missing states. It SHALL NOT fall back to cl, kn, or a global factory scope.

Each such failure SHALL additionally be recorded in a bounded in-process unpaired display access aggregate, so that management surfaces can observe that display machines are being denied. Recording SHALL NOT change the response status, error code, or body, and a failure to record SHALL NOT prevent the denial response from being returned.

#### Scenario: Unpaired Client requests a Story

- **WHEN** a Client without a Device Credential requests a formal runtime Story
- **THEN** the system returns 401 with code device_unpaired
- **AND** no Site-specific Story payload is returned

#### Scenario: Denial is recorded without changing the response

- **WHEN** a Device context resolution failure produces a denial response
- **THEN** the system SHALL record one occurrence with that error code and the requested route path
- **AND** the denial response SHALL be identical to the response produced before recording existed

#### Scenario: Recording failure does not suppress the denial

- **WHEN** recording an occurrence raises an error
- **THEN** the system SHALL still return the denial response
- **AND** the error SHALL NOT propagate as an unhandled failure


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
### Requirement: Produce Site-scoped Story, Readiness, and Effective Rotation

The Server SHALL apply Site Scope before Story aggregation, Readiness evaluation, Freshness evaluation, and Effective Rotation. Common Profile pages SHALL remain shared, while Factory Circuit, Sustainability, Overview, and Solar data SHALL use only the Context Site.

#### Scenario: CL and KN Devices share one Profile

- **WHEN** paired CL and KN Devices request the same Profile revision
- **THEN** common pages have the same configured order
- **AND** each Device receives only its own Site-specific Factory Circuit and data sources
- **AND** missing data in the other Site does not block its rotation


<!-- @trace
source: device-context-site-scoped-playback
updated: 2026-07-30
code:
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/deviceIdentity.ts
  - packages/shared/src/displayReadiness.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/routes/playback.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - docs/ops/workflow.md
  - apps/server/src/app.ts
  - docs/ops/maintenance.md
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/index.ts
  - apps/server/src/fastify.ts
  - scripts/fhd-witness-config.mjs
  - packages/shared/src/playback.ts
  - apps/server/src/routes/display-readiness.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/services/playbackProfileService.ts
  - packages/shared/src/displayClientContext.ts
  - .env.example
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - CLAUDE.md
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/devicePairing.ts
  - apps/server/src/services/deviceCredentialService.ts
  - docs/ops/conventions.md
  - deploy/install-thin-kiosk.sh
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/config.ts
  - docs/architecture/default-playback-profile.md
  - scripts/deploy.test.mjs
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/ops/delegation.md
  - apps/server/src/routes/device-groups.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/routes/devices.ts
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/services/displayStoryService.ts
  - AGENTS.md
  - scripts/capture-fhd-witness.mjs
  - .scratch/device-scoped-multisite-playback/spec.md
tests:
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Reuse equivalent Effective Rotation snapshots

The system SHALL reuse a complete Effective Rotation result for requests with the same Profile revision, Site Scope, Readiness revision, and Freshness revision. A relevant revision change SHALL invalidate that result.

#### Scenario: Fifty Devices use two Site cohorts

- **WHEN** 25 cl Devices and 25 kn Devices request an unchanged Profile revision
- **THEN** the system performs at most one full evaluation for cl and one for kn
- **AND** all Devices receive the correct cohort result


<!-- @trace
source: device-context-site-scoped-playback
updated: 2026-07-30
code:
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/deviceIdentity.ts
  - packages/shared/src/displayReadiness.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/routes/playback.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - docs/ops/workflow.md
  - apps/server/src/app.ts
  - docs/ops/maintenance.md
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/index.ts
  - apps/server/src/fastify.ts
  - scripts/fhd-witness-config.mjs
  - packages/shared/src/playback.ts
  - apps/server/src/routes/display-readiness.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/services/playbackProfileService.ts
  - packages/shared/src/displayClientContext.ts
  - .env.example
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - CLAUDE.md
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/devicePairing.ts
  - apps/server/src/services/deviceCredentialService.ts
  - docs/ops/conventions.md
  - deploy/install-thin-kiosk.sh
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/config.ts
  - docs/architecture/default-playback-profile.md
  - scripts/deploy.test.mjs
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/ops/delegation.md
  - apps/server/src/routes/device-groups.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/routes/devices.ts
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/services/displayStoryService.ts
  - AGENTS.md
  - scripts/capture-fhd-witness.mjs
  - .scratch/device-scoped-multisite-playback/spec.md
tests:
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Apply Site changes at a Safe Playback Boundary

A Client SHALL NOT interrupt a valid current page when contextRevision changes. It SHALL finish the current page duration when that page remains valid, or SHALL switch at the next transition tick when the current page is invalid.

#### Scenario: Device moves from cl to kn while showing the CL circuit page

- **WHEN** the Client receives a kn contextRevision and the current CL circuit page is absent from the new rotation
- **THEN** it switches at the next transition tick to the valid start page
- **AND** it does not continue into another CL-only page

<!-- @trace
source: device-context-site-scoped-playback
updated: 2026-07-30
code:
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/deviceIdentity.ts
  - packages/shared/src/displayReadiness.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/routes/playback.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - docs/ops/workflow.md
  - apps/server/src/app.ts
  - docs/ops/maintenance.md
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/index.ts
  - apps/server/src/fastify.ts
  - scripts/fhd-witness-config.mjs
  - packages/shared/src/playback.ts
  - apps/server/src/routes/display-readiness.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/services/playbackProfileService.ts
  - packages/shared/src/displayClientContext.ts
  - .env.example
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - CLAUDE.md
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/devicePairing.ts
  - apps/server/src/services/deviceCredentialService.ts
  - docs/ops/conventions.md
  - deploy/install-thin-kiosk.sh
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/config.ts
  - docs/architecture/default-playback-profile.md
  - scripts/deploy.test.mjs
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/ops/delegation.md
  - apps/server/src/routes/device-groups.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/routes/devices.ts
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/services/displayStoryService.ts
  - AGENTS.md
  - scripts/capture-fhd-witness.mjs
  - .scratch/device-scoped-multisite-playback/spec.md
tests:
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->