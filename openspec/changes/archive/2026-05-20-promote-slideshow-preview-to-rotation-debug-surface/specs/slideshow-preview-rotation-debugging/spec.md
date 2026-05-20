## ADDED Requirements

### Requirement: Show effective rotation debugging in Slideshow Preview

The system SHALL show effective rotation debugging details in `Slideshow Preview` alongside the visual playback preview.

#### Scenario: Some configured pages are skipped

- **WHEN** the current rotation state skips one or more configured pages
- **THEN** `Slideshow Preview` SHALL show the effective playable sequence and the skipped pages separately
- **AND** it SHALL preserve the machine-readable skip semantics already used by the rotation diagnostics surfaces

### Requirement: Surface fallback route context in Slideshow Preview

The system SHALL surface fallback route context in `Slideshow Preview` when playback is operating under a fallback or degraded rotation state.

#### Scenario: No page can play and fallback routing is active

- **WHEN** the rotation state falls back to an offline route or other fallback destination
- **THEN** `Slideshow Preview` SHALL show that fallback route as part of the preview debug state
- **AND** the page SHALL not present the current preview as if it came from a fully healthy rotation sequence
