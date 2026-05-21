## MODIFIED Requirements

### Requirement: Treat Images as a playlist domain with ordered entries

The system SHALL treat `Images` playback as an ordered playlist of entries with enabled state and per-entry duration.

#### Scenario: Operator reorders Images entries

- **WHEN** an operator changes the order or enabled state of Images playlist entries
- **THEN** the persisted playlist reflects the new sequence
- **AND** the `Images` display route uses that sequence when selecting slides

#### Scenario: Images runtime advances by per-entry duration

- **WHEN** the current playable `Images` slide reaches the configured `durationSeconds` for that resolved playlist entry
- **THEN** the `Images` display route SHALL advance to the next playable slide in the resolved playlist order
- **AND** the autoplay timer SHALL restart from the newly active slide's own duration

##### Example: Three playable entries rotate in order

- **GIVEN** the resolved playlist order is `IMG-01 (5s)`, `IMG-02 (8s)`, `IMG-03 (6s)`
- **WHEN** playback starts on `IMG-01`
- **THEN** the page advances to `IMG-02` after 5 seconds
- **AND** it advances to `IMG-03` after 8 more seconds

#### Scenario: Manual navigation keeps autoplay active

- **WHEN** an operator or viewer manually changes the active `Images` slide through arrows or thumbnails
- **THEN** the page SHALL immediately show the selected slide
- **AND** autoplay SHALL continue from that slide using its resolved duration instead of disabling the slideshow loop

#### Scenario: Fallback-active entries remain inside the slideshow loop

- **WHEN** the active resolved playlist entry is playable only through its configured fallback behavior
- **THEN** the `Images` display route SHALL keep that fallback slide active for the entry's duration
- **AND** it SHALL continue advancing to the next playable entry instead of aborting the playlist
