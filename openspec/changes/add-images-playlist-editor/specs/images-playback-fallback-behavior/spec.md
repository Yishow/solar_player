## ADDED Requirements

### Requirement: Make fallback behavior explicit for missing or pending Images slides

The system SHALL define explicit fallback behavior for Images playlist entries whose asset is missing, pending, or not suitable for the stage.

#### Scenario: Playlist entry asset is missing

- **WHEN** the active Images playlist entry cannot resolve a valid asset
- **THEN** the display route applies the configured fallback behavior for that entry
- **AND** the rest of the playlist remains playable

##### Example: Second playlist entry falls back to placeholder stage

- **GIVEN** playlist entry `IMG-02` points to an asset that no longer exists
- **WHEN** playback reaches that entry
- **THEN** the stage uses the configured placeholder or fallback behavior for `IMG-02`
- **AND** playback continues to later entries instead of aborting the playlist

### Requirement: Keep Images fallback behavior diagnosable in management workflow

The system SHALL expose fallback behavior state for Images playlist entries in management workflow.

#### Scenario: Management surface inspects a degraded slide

- **WHEN** a management route loads an Images playlist entry using fallback behavior
- **THEN** it can identify the fallback mode and reason
- **AND** the operator can tell whether the entry is still playable

##### Example: Management page shows skip-worthy slide degradation

- **GIVEN** an Images playlist entry is configured to skip when its asset is unavailable
- **WHEN** the management surface loads that degraded entry
- **THEN** it shows the fallback mode as `skip`
- **AND** the operator can tell that the entry is currently degraded but the playlist still works
