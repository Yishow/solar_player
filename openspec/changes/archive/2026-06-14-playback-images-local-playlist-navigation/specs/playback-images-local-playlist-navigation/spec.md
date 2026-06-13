## ADDED Requirements

### Requirement: Images advances the active item locally from a reusable playlist payload

The system SHALL let Images advance the visible active item locally from a reusable playlist payload instead of coupling each active item change to a remote playlist read.

#### Scenario: Autoplay advances the active item without a remote read

- **WHEN** autoplay advances the active item while a reusable playlist payload is already loaded
- **THEN** the page derives the next visible item locally
- **AND** it does not require a remote playlist read for that active item change alone

#### Scenario: Manual navigation advances the active item without a remote read

- **WHEN** the operator triggers manual next or previous navigation while the reusable playlist payload is already loaded
- **THEN** the page updates the active item locally
- **AND** it keeps the visible stage, caption, and thumbnail state in sync without a new remote read

#### Scenario: Shuffle autoplay advances the active item without a per-item remote read

- **WHEN** autoplay runs with shuffle enabled while the reusable playlist payload is already loaded
- **THEN** the page derives the next visible shuffled item locally
- **AND** it does not require a remote playlist read for that shuffled active item change alone

### Requirement: Images reconciles the active item after playlist refresh without visible regression

The system SHALL reconcile the active item after playlist refresh while preserving the visible stage and fallback behavior.

#### Scenario: Playlist refresh updates the payload while keeping the visible stage usable

- **WHEN** a playlist refresh returns new playlist data after the page already showed an active item
- **THEN** the page reconciles the active item against the refreshed payload
- **AND** it keeps the visible stage, caption, thumbnail, and fallback behavior usable during the transition
