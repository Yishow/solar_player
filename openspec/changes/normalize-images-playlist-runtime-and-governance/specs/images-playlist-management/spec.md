## MODIFIED Requirements

### Requirement: Treat Images as a playlist domain with ordered entries

The system SHALL treat `Images` playback order, duration, enabled state, and fallback behavior as playlist-entry responsibilities instead of splitting those semantics across playlist rows and legacy image asset fields.

#### Scenario: Operator edits slide duration for a playlist entry

- **WHEN** an operator changes the duration of a playlist entry
- **THEN** the persisted playlist entry becomes the single source of truth for playback timing
- **AND** the runtime does not require a mirrored update to legacy image-asset slideshow fields

##### Example: Changing `IMG-03` duration leaves asset metadata untouched

- **GIVEN** playlist entry `IMG-03` points to asset `17`
- **WHEN** the operator changes `IMG-03` from `10` seconds to `18` seconds
- **THEN** the updated duration is stored on `IMG-03`
- **AND** asset `17` is not required to mirror that playback duration in a legacy slideshow field
