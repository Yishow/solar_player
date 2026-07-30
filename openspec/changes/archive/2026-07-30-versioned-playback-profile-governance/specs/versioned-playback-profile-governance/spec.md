## ADDED Requirements

### Requirement: Manage reusable Playback Profiles and mutable Drafts

A trusted manager SHALL be able to create, rename, and archive non-Default Playback Profiles. Each Profile SHALL have one mutable Draft that completely represents page membership, order, duration, start page, Autoplay, Loop, and Schedule. Runtime playback SHALL NOT read an unpublished Draft.

#### Scenario: Save a Draft with a stale revision

- **WHEN** a manager submits a Draft based on an older revision
- **THEN** the system returns 409 with code profile_draft_conflict and currentRevision
- **AND** the newer Draft remains unchanged

### Requirement: Preview both Site Scopes before Publish

A Profile Draft preview SHALL return separate cl and kn Effective Rotations with configured pages, effective pages, skipped pages, skip reasons, fallback diagnostics, Readiness, and Freshness. Preview SHALL NOT assign a desired version to any Device or Group.

#### Scenario: Preview a Draft containing both Factory Circuit pages

- **WHEN** a trusted manager requests Preview
- **THEN** the cl result contains the CL circuit page and excludes the KN page with a Site diagnostic
- **AND** the kn result contains the KN circuit page and excludes the CL page with a Site diagnostic

##### Example: Site-specific circuit filtering

- **GIVEN** the Draft enables `factory-circuit` and `factory-circuit-guanyin`
- **WHEN** Preview evaluates the Draft for both Site Scopes
- **THEN** CL skips `factory-circuit-guanyin` with `site-scope`
- **AND** KN skips `factory-circuit` with `site-scope`

### Requirement: Publish immutable Profile Versions

Publish SHALL validate the complete Draft and append an immutable Profile Version with a monotonically increasing version number. A published Version SHALL retain the exact settings, ordered pages, Schedule, creation metadata, and schema version.

#### Scenario: Read an old Version after later publishes

- **WHEN** Version 3 is published after Version 2
- **THEN** reading Version 2 returns the same snapshot it had at creation
- **AND** no Draft mutation changes Version 2

#### Scenario: Publish an invalid Draft

- **WHEN** the Draft has no effective page or references an invalid start page
- **THEN** Publish returns a validation error
- **AND** no Version row is appended

##### Example: Disabled start page

- **GIVEN** the Draft start page references page id 3
- **AND** page id 3 is disabled
- **WHEN** the manager publishes the current Draft revision
- **THEN** Publish returns `profile_publish_invalid`
- **AND** the Profile Version count does not change

### Requirement: Roll back by appending a new linear Version

Rollback SHALL copy the selected historical Version into a new Version and SHALL record rollbackFromVersionId. It SHALL NOT edit, reactivate, or delete historical Versions.

#### Scenario: Roll back from Version 5 to Version 2 content

- **WHEN** a manager confirms rollback to Version 2
- **THEN** the system creates Version 6 with content equal to Version 2
- **AND** Versions 2 through 5 remain immutable

### Requirement: Preserve the Default Profile compatibility facade

Existing Playback settings, pages, and rotation APIs SHALL continue to address the Default Profile through the shared Profile service. Multi-Profile governance SHALL NOT introduce a second persistence path or legacy dual-write.

#### Scenario: Update the existing Playback settings API

- **WHEN** a caller updates the legacy-compatible Playback settings route
- **THEN** the Default Profile current configuration changes
- **AND** no legacy playback table becomes an independent source of truth

##### Example: Default brightness compatibility

- **GIVEN** the Default Profile brightness is 100
- **WHEN** a caller updates `/api/playback/settings` to brightness 64
- **THEN** the Default Profile current configuration and Draft read 64
- **AND** the legacy `playback_settings` row is not read as a competing value
