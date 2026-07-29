## ADDED Requirements

### Requirement: Existing playback state migrates to one Default Playback Profile

The system SHALL create exactly one Default Playback Profile and preserve the existing global playback settings and active display page playback state during upgrade.

#### Scenario: Upgrade a legacy database

- **GIVEN** a database with legacy playback settings and display page registry playback fields
- **WHEN** the Default Playback Profile migration runs
- **THEN** exactly one Default Playback Profile exists
- **AND** its settings equal the legacy settings
- **AND** each unarchived registry page has one Profile Page membership with the same enabled, order and duration values

#### Scenario: Re-run the migration

- **GIVEN** the Default Playback Profile and memberships already exist
- **WHEN** the migration is applied again
- **THEN** no duplicate profile, settings or membership is created
- **AND** existing Profile state is not overwritten

### Requirement: Legacy Playback APIs are a compatibility façade

The existing Playback APIs SHALL preserve their public response and update behavior while reading and writing only the Default Playback Profile.

#### Scenario: Read playback state after legacy rows diverge

- **GIVEN** Default Profile state and contradictory values in legacy playback rows
- **WHEN** a caller reads playback settings, pages or rotation plan
- **THEN** the response reflects Default Profile state
- **AND** no response shape changes are required by existing callers

#### Scenario: Update through the existing API

- **WHEN** a caller updates playback settings or pages through the existing API
- **THEN** the Default Profile is updated
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
