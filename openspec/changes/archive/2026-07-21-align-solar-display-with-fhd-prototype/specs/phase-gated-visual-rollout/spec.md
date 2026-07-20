## ADDED Requirements

### Requirement: Enforce hard phase gates for the visual rollout

The rollout SHALL enforce hard phase gates so downstream work cannot begin until upstream prerequisites and evidence are complete.

#### Scenario: A later phase is requested before an earlier phase is complete

- **GIVEN** a later rollout phase depends on an earlier phase
- **WHEN** an implementer attempts to start the later phase
- **THEN** the work SHALL remain blocked until the earlier phase has passed its exit criteria
- **AND** the change artifacts explicitly identify that blocking relationship

##### Example:

- **GIVEN** Phase 2 for `/overview` and `/solar` depends on Phase 1 shell completion
- **WHEN** an implementer tries to migrate `/overview` before Phase 1 evidence exists
- **THEN** the migration is blocked by the artifacts
- **AND** the implementer is directed back to shell verification first

### Requirement: Split route migration by functional risk and coupling

The rollout SHALL split route migration by functional risk and route coupling rather than by total route count.

#### Scenario: A high-risk interactive page is scheduled

- **WHEN** the rollout reaches a page with save, test, or CRUD behavior
- **THEN** that page is isolated in its own phase or a tightly scoped risk batch
- **AND** its interaction verification is recorded separately from purely visual checks

##### Example:

- **GIVEN** `/settings/mqtt` has save, test connection, topic mapping, and status flows
- **WHEN** the rollout plan is written
- **THEN** `/settings/mqtt` is isolated as a dedicated high-risk phase
- **AND** it is not combined with low-risk display routes simply to reduce task count

#### Scenario: A tightly coupled playback pair is scheduled

- **WHEN** two playback routes share the same primitive family and similar risk profile
- **THEN** they SHALL be allowed to migrate in the same batch
- **AND** the batch still names both routes explicitly

##### Example:

- **GIVEN** `/overview` and `/solar` both depend on shell, KPI, and hero primitives
- **WHEN** the playback rollout is split
- **THEN** they are allowed to share the first playback batch
- **AND** `/factory-circuit` remains separate because of its flow-specific mapping risk

### Requirement: Save an evidence bundle at every phase boundary

Every completed phase SHALL save an evidence bundle that can be used by a later implementer or reviewer without re-exploring the codebase.

#### Scenario: A phase is marked complete

- **WHEN** a rollout phase is marked complete
- **THEN** the artifacts record the affected routes, executed commands, screenshot evidence, and unresolved gaps
- **AND** the evidence is sufficient for a later implementer to understand what was completed and what remains

##### Example:

- **GIVEN** the Playback Batch C phase has completed
- **WHEN** the phase is handed off
- **THEN** the artifacts include `/images` and `/sustainability` screenshot references, the build command output, fallback checks, and any remaining asset gaps
- **AND** the next phase does not need to rediscover those facts from scratch
