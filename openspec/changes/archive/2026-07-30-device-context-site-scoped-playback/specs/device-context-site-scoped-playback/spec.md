## ADDED Requirements

### Requirement: Resolve a trusted Display Client Context

Formal playback requests SHALL resolve Device, Group, Site Scope, Playback Profile, and contextRevision from a valid Device Credential. Runtime routes SHALL NOT accept query parameters, custom headers, or Client state as authoritative Site Scope.

#### Scenario: Paired CL Device requests playback context

- **WHEN** an enabled paired Device in an enabled cl Group requests formal playback data
- **THEN** the system resolves a Context containing that Device, Group, cl Site Scope, assigned Profile, and contextRevision

#### Scenario: Client declares a different Site Scope

- **WHEN** a kn Device supplies a query parameter or header claiming cl
- **THEN** the system ignores the claim
- **AND** all formal playback data remains scoped to kn

### Requirement: Fail closed when Device context is unavailable

The system SHALL return explicit unpaired, revoked, disabled, group-disabled, group-missing, or profile-missing states. It SHALL NOT fall back to cl, kn, or a global factory scope.

#### Scenario: Unpaired Client requests a Story

- **WHEN** a Client without a Device Credential requests a formal runtime Story
- **THEN** the system returns 401 with code device_unpaired
- **AND** no Site-specific Story payload is returned

### Requirement: Produce Site-scoped Story, Readiness, and Effective Rotation

The Server SHALL apply Site Scope before Story aggregation, Readiness evaluation, Freshness evaluation, and Effective Rotation. Common Profile pages SHALL remain shared, while Factory Circuit, Sustainability, Overview, and Solar data SHALL use only the Context Site.

#### Scenario: CL and KN Devices share one Profile

- **WHEN** paired CL and KN Devices request the same Profile revision
- **THEN** common pages have the same configured order
- **AND** each Device receives only its own Site-specific Factory Circuit and data sources
- **AND** missing data in the other Site does not block its rotation

### Requirement: Reuse equivalent Effective Rotation snapshots

The system SHALL reuse a complete Effective Rotation result for requests with the same Profile revision, Site Scope, Readiness revision, and Freshness revision. A relevant revision change SHALL invalidate that result.

#### Scenario: Fifty Devices use two Site cohorts

- **WHEN** 25 cl Devices and 25 kn Devices request an unchanged Profile revision
- **THEN** the system performs at most one full evaluation for cl and one for kn
- **AND** all Devices receive the correct cohort result

### Requirement: Apply Site changes at a Safe Playback Boundary

A Client SHALL NOT interrupt a valid current page when contextRevision changes. It SHALL finish the current page duration when that page remains valid, or SHALL switch at the next transition tick when the current page is invalid.

#### Scenario: Device moves from cl to kn while showing the CL circuit page

- **WHEN** the Client receives a kn contextRevision and the current CL circuit page is absent from the new rotation
- **THEN** it switches at the next transition tick to the valid start page
- **AND** it does not continue into another CL-only page
