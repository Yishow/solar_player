# device-group-management Specification

## Purpose

Define the foundational Device and Group management model, mutation boundary, and lifecycle integrity rules.

## Requirements

### Requirement: Persist stable devices and flat groups

The system SHALL persist each Device with a globally unique human-readable clientId, a displayName, an enabled state, and exactly one Group reference when the Device is enabled. Each Group SHALL have a unique name, an enabled state, a Site Scope of cl or kn, and a valid Playback Profile reference.

#### Scenario: Create an enabled Device in a valid Group

- **WHEN** a trusted management caller creates enabled Device lobby-cl-01 in an enabled cl Group that references the Default Playback Profile
- **THEN** the system stores the Device and returns its resolved Group, Site Scope, and Profile summary

#### Scenario: Reject an enabled Device without an active Group

- **WHEN** a trusted management caller creates or enables a Device without an enabled Group
- **THEN** the system rejects the mutation with a stable validation code
- **AND** it SHALL NOT persist a partially enabled Device


<!-- @trace
source: device-group-management-foundation
updated: 2026-07-30
code:
  - CLAUDE.md
  - packages/shared/src/deviceIdentity.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - docs/agents/issue-tracker.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/services/playbackProfileService.ts
  - apps/server/src/routes/devices.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - docs/ops/delegation.md
  - apps/server/src/app.ts
  - .scratch/device-scoped-multisite-playback/spec.md
  - docs/ops/dispatch.md
  - docs/ops/maintenance.md
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayRotationService.ts
  - AGENTS.md
  - apps/server/src/services/deviceGroupService.ts
  - docs/ops/judgment.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - docs/ops/conventions.md
  - docs/architecture/default-playback-profile.md
  - docs/ops/workflow.md
  - packages/shared/src/index.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - packages/shared/src/deviceIdentity.contract.ts
tests:
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->

---
### Requirement: Keep group assignment unambiguous

The system SHALL model Device membership as a single Group reference. It SHALL NOT support nested Groups, multiple simultaneous Group memberships, arbitrary Site Scope values, or per-device playback overrides.

#### Scenario: Move a Device between Groups

- **WHEN** a trusted management caller moves a Device from a cl Group to a kn Group
- **THEN** the Device SHALL reference only the kn Group after the transaction commits
- **AND** no cl Group membership SHALL remain


<!-- @trace
source: device-group-management-foundation
updated: 2026-07-30
code:
  - CLAUDE.md
  - packages/shared/src/deviceIdentity.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - docs/agents/issue-tracker.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/services/playbackProfileService.ts
  - apps/server/src/routes/devices.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - docs/ops/delegation.md
  - apps/server/src/app.ts
  - .scratch/device-scoped-multisite-playback/spec.md
  - docs/ops/dispatch.md
  - docs/ops/maintenance.md
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayRotationService.ts
  - AGENTS.md
  - apps/server/src/services/deviceGroupService.ts
  - docs/ops/judgment.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - docs/ops/conventions.md
  - docs/architecture/default-playback-profile.md
  - docs/ops/workflow.md
  - packages/shared/src/index.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - packages/shared/src/deviceIdentity.contract.ts
tests:
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->

---
### Requirement: Protect Device and Group management mutations

Device and Group create, update, enable, disable, and delete operations SHALL use the existing management mutation access boundary.

#### Scenario: Playback session attempts a Group mutation

- **WHEN** an untrusted playback session submits a Device Group mutation
- **THEN** the system rejects it with the existing management access denied envelope
- **AND** no Device or Group state changes


<!-- @trace
source: device-group-management-foundation
updated: 2026-07-30
code:
  - CLAUDE.md
  - packages/shared/src/deviceIdentity.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - docs/agents/issue-tracker.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/services/playbackProfileService.ts
  - apps/server/src/routes/devices.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - docs/ops/delegation.md
  - apps/server/src/app.ts
  - .scratch/device-scoped-multisite-playback/spec.md
  - docs/ops/dispatch.md
  - docs/ops/maintenance.md
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayRotationService.ts
  - AGENTS.md
  - apps/server/src/services/deviceGroupService.ts
  - docs/ops/judgment.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - docs/ops/conventions.md
  - docs/architecture/default-playback-profile.md
  - docs/ops/workflow.md
  - packages/shared/src/index.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - packages/shared/src/deviceIdentity.contract.ts
tests:
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->

---
### Requirement: Preserve referential integrity during Group lifecycle changes

The system SHALL reject deletion of a Group that is referenced by any Device. Disabling a Group SHALL retain its Device references and SHALL make those Devices ineligible for formal playback context.

#### Scenario: Delete a referenced Group

- **WHEN** a trusted management caller deletes a Group referenced by one or more Devices
- **THEN** the system returns 409 with code group_in_use
- **AND** the Group and Device references remain unchanged

<!-- @trace
source: device-group-management-foundation
updated: 2026-07-30
code:
  - CLAUDE.md
  - packages/shared/src/deviceIdentity.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - docs/agents/issue-tracker.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/routes/device-groups.ts
  - apps/server/src/services/playbackProfileService.ts
  - apps/server/src/routes/devices.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - docs/ops/delegation.md
  - apps/server/src/app.ts
  - .scratch/device-scoped-multisite-playback/spec.md
  - docs/ops/dispatch.md
  - docs/ops/maintenance.md
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayRotationService.ts
  - AGENTS.md
  - apps/server/src/services/deviceGroupService.ts
  - docs/ops/judgment.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - docs/ops/conventions.md
  - docs/architecture/default-playback-profile.md
  - docs/ops/workflow.md
  - packages/shared/src/index.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - packages/shared/src/deviceIdentity.contract.ts
tests:
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->