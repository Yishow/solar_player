## ADDED Requirements

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
