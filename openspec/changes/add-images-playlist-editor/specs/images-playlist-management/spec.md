## ADDED Requirements

### Requirement: Treat Images as a playlist domain with ordered entries

The system SHALL treat `Images` playback as an ordered playlist of entries with enabled state and per-entry duration.

#### Scenario: Operator reorders Images entries

- **WHEN** an operator changes the order or enabled state of Images playlist entries
- **THEN** the persisted playlist reflects the new sequence
- **AND** the `Images` display route uses that sequence when selecting slides

### Requirement: Allow per-entry playback duration in Images playlist management

The system SHALL let each Images playlist entry define its own display duration.

#### Scenario: Playlist entry uses custom duration

- **WHEN** a playlist entry has a configured display duration
- **THEN** the Images playback logic uses that duration for the active slide
- **AND** management UI shows that configured duration

##### Example: Cover slide stays longer than gallery slides

- **GIVEN** playlist entry `IMG-01` is configured for `25` seconds and `IMG-02` for `10` seconds
- **WHEN** `IMG-01` becomes the active slide
- **THEN** the playback logic keeps `IMG-01` visible for `25` seconds
- **AND** the management UI shows that longer per-entry duration
