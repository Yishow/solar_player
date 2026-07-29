# default-playback-profile-compatibility Specification

## Purpose

TBD - created by archiving change 'default-playback-profile-compatibility'. Update Purpose after archive.

## Requirements

### Requirement: Existing playback state migrates to one Default Playback Profile

The system SHALL create exactly one Default Playback Profile, preserve Profile-owned playback settings and active display page playback state there, and preserve Transition and Freshness enforcement in one global Playback Runtime Policy during upgrade.

#### Scenario: Upgrade a legacy database

- **GIVEN** a database with legacy playback settings and display page registry playback fields
- **WHEN** the Default Playback Profile migration runs
- **THEN** exactly one Default Playback Profile exists
- **AND** its Profile-owned settings equal the corresponding legacy settings
- **AND** the global Playback Runtime Policy equals the legacy transition type, transition speed and freshness enforcement
- **AND** each unarchived registry page has one Profile Page membership with the same enabled, order and duration values

#### Scenario: Upgrade a database that already applied the original Profile migration

- **GIVEN** the original 027 migration has copied Transition and Freshness state into Default Profile Settings
- **AND** an operator has updated that Profile state after legacy playback rows stopped receiving writes
- **WHEN** the global Playback Runtime Policy migration runs
- **THEN** it copies Transition and Freshness state from the Default Profile Settings row
- **AND** it does not regress to the older legacy playback row

#### Scenario: Re-run the migration

- **GIVEN** the Default Playback Profile and memberships already exist
- **WHEN** the migration is applied again
- **THEN** no duplicate profile, settings or membership is created
- **AND** existing Profile or global Playback Runtime Policy state is not overwritten


<!-- @trace
source: default-playback-profile-compatibility
updated: 2026-07-30
code:
  - docs/ops/maintenance.md
  - AGENTS.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/db/seed.ts
  - docs/agents/issue-tracker.md
  - CLAUDE.md
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - apps/server/src/services/playbackProfileService.ts
  - docs/ops/delegation.md
  - .scratch/device-scoped-multisite-playback/spec.md
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - docs/ops/conventions.md
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/architecture/default-playback-profile.md
  - docs/ops/workflow.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
tests:
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
-->

---
### Requirement: Legacy Playback APIs are a compatibility façade

The existing Playback APIs SHALL preserve their public response and update behavior while reading and writing only the Default Playback Profile and global Playback Runtime Policy.

#### Scenario: Read playback state after legacy rows diverge

- **GIVEN** Default Profile and global Playback Runtime Policy state plus contradictory values in legacy playback rows
- **WHEN** a caller reads playback settings, pages or rotation plan
- **THEN** the response composes Default Profile and global Playback Runtime Policy state
- **AND** no response shape changes are required by existing callers

#### Scenario: Update through the existing API

- **WHEN** a caller updates playback settings or pages through the existing API
- **THEN** Profile-owned fields update the Default Profile
- **AND** transition and freshness enforcement fields update the global Playback Runtime Policy
- **AND** transition normalization, page ordering and socket notification behavior remain unchanged
- **AND** legacy playback rows are not dual-written


<!-- @trace
source: default-playback-profile-compatibility
updated: 2026-07-30
code:
  - docs/ops/maintenance.md
  - AGENTS.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/db/seed.ts
  - docs/agents/issue-tracker.md
  - CLAUDE.md
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - apps/server/src/services/playbackProfileService.ts
  - docs/ops/delegation.md
  - .scratch/device-scoped-multisite-playback/spec.md
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - docs/ops/conventions.md
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/architecture/default-playback-profile.md
  - docs/ops/workflow.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
tests:
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
-->

---
### Requirement: Display page catalog and playback state remain consistent

The system SHALL compose display page identity from the registry with playback state from the Default Profile.

#### Scenario: Create a display page instance

- **WHEN** an operator creates a new display page instance
- **THEN** the registry identity and Default Profile membership are created atomically
- **AND** the returned instance contains the requested enabled, order and duration state

#### Scenario: Archive a display page instance

- **WHEN** an operator archives a display page instance
- **THEN** the registry records the archive
- **AND** the Default Profile membership is disabled
- **AND** the page no longer appears in active playback pages

<!-- @trace
source: default-playback-profile-compatibility
updated: 2026-07-30
code:
  - docs/ops/maintenance.md
  - AGENTS.md
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/db/seed.ts
  - docs/agents/issue-tracker.md
  - CLAUDE.md
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - apps/server/src/services/playbackProfileService.ts
  - docs/ops/delegation.md
  - .scratch/device-scoped-multisite-playback/spec.md
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - docs/ops/conventions.md
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/architecture/default-playback-profile.md
  - docs/ops/workflow.md
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
tests:
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
-->