## ADDED Requirements

### Requirement: Integrate Playback Settings with display operations summary

The system SHALL integrate `Playback Settings` with display operations summary so operators can see publish state, effective rotation status, and skip reasons while managing playback.

#### Scenario: Playback Settings shows skipped page

- **WHEN** a configured display page is skipped by current display operations conditions
- **THEN** `Playback Settings` shows that page as configured but currently skipped
- **AND** it includes the skip reason in the management view

### Requirement: Show pending display changes that affect playback workflow

The system SHALL show pending display changes that affect playback workflow in `Playback Settings`.

#### Scenario: Unpublished draft affects playback planning

- **WHEN** an unpublished draft exists for a page already in the rotation plan
- **THEN** `Playback Settings` can show that the configured playback plan differs from the currently published display state
