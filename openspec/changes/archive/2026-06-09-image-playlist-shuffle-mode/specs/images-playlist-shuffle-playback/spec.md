## ADDED Requirements

### Requirement: Provide a persisted playlist-level shuffle setting

The system SHALL persist a playlist-level shuffle setting for the Images playlist as a single boolean that defaults to off. The shuffle setting SHALL be readable in the image-playlist payload and updatable through the image-playlist API. Updating the setting SHALL emit the existing images-updated and display-sync notifications.

#### Scenario: Shuffle defaults off and persists when updated

- **WHEN** the Images playlist has never had its shuffle setting changed
- **THEN** the image-playlist payload SHALL report shuffle as off
- **AND** after the shuffle setting is updated to on, a subsequent read SHALL report shuffle as on

#### Scenario: Updating shuffle notifies runtime surfaces

- **WHEN** the shuffle setting is updated through the image-playlist API
- **THEN** the system SHALL emit the existing images-updated and display-sync notifications

### Requirement: Randomize Images playback order when shuffle is on

When shuffle is on, the system SHALL compute the Images slideshow order as a randomized permutation of the enabled, playable entries that covers every such entry exactly once per cycle, and SHALL reshuffle on each new cycle. When shuffle is off, the order SHALL be the existing display order. The order SHALL be computed by a pure function of the entries, the shuffle flag, and a seed so the result is deterministic for a given seed.

#### Scenario: Shuffle off keeps display order

- **WHEN** the playback order is resolved with shuffle off
- **THEN** the order SHALL equal the entries in display order

#### Scenario: Shuffle on covers every enabled entry once per cycle

- **WHEN** the playback order is resolved with shuffle on for a given seed
- **THEN** the order SHALL contain every enabled, playable entry exactly once
- **AND** resolving again with the same entries and seed SHALL produce the same order

##### Example: a fixed seed yields a deterministic permutation that covers all entries

- **GIVEN** enabled, playable entries IMG-01, IMG-02, IMG-03, IMG-04
- **WHEN** the playback order is resolved with shuffle on and a fixed seed
- **THEN** the resulting order SHALL be a permutation containing IMG-01, IMG-02, IMG-03, and IMG-04 exactly once each
- **AND** the same seed SHALL always produce that same permutation
