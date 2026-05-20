## MODIFIED Requirements

### Requirement: Make fallback behavior explicit for missing or pending Images slides

The system SHALL make `Images` playback fallback behavior explicit per playlist entry so placeholder, skip, and cover-based fallback are distinguishable in both runtime and management surfaces.

#### Scenario: Playlist entry falls back to cover

- **WHEN** an active playlist entry has no ready asset and its fallback mode is `use-cover`
- **THEN** the playback surface uses the configured cover asset as the fallback media
- **AND** the runtime metadata still reports that the active entry is in a fallback state
