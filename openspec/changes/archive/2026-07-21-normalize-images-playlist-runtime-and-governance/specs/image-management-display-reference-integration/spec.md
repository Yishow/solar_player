## MODIFIED Requirements

### Requirement: Integrate Image Management with display page references

The system SHALL let image management show the difference between asset-library metadata and playlist-entry playback references without conflating them.

#### Scenario: Asset is healthy but playlist entry is degraded

- **WHEN** an image asset exists on disk but its playlist entry is disabled or uses fallback
- **THEN** management can report the asset as healthy while still showing the playlist entry's degraded playback state
- **AND** operators can fix the playlist reference without assuming the file itself is broken

##### Example: Healthy file but skipped playlist row

- **GIVEN** asset `42` exists on disk and is referenced by playlist entry `IMG-07`
- **WHEN** `IMG-07` is disabled or falls back to placeholder mode
- **THEN** Image Management shows asset `42` as file-healthy
- **AND** it separately shows `IMG-07` as degraded playback state
