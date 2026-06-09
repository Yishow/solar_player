## ADDED Requirements

### Requirement: Derive the Images page rotation slot from the enabled playlist

The system SHALL derive the Images playback page's effective rotation duration from its enabled, playable image playlist entries so that every enabled image plays once before page rotation advances. The effective duration SHALL equal the sum of the durations of entries that are both enabled and playable, with a floor of 1 second. When the playlist has no enabled, playable entry, the Images page SHALL use its configured registry duration unchanged. The derived duration SHALL be applied identically to the runtime rotation and the management rotation preview.

#### Scenario: Images slot covers the whole enabled playlist

- **WHEN** the Images playlist has enabled, playable entries with per-entry durations
- **THEN** the Images page's effective rotation duration SHALL equal the sum of those entries' durations
- **AND** the same duration SHALL appear in the management rotation preview and in the runtime rotation

##### Example: three enabled images sum to the slot duration

- **GIVEN** the Images playlist has three enabled, playable entries with durations 10, 15, and 5 seconds
- **AND** one additional entry is disabled with duration 20 seconds
- **WHEN** the Images page rotation duration is derived
- **THEN** the effective rotation duration SHALL be 30 seconds

#### Scenario: Empty playlist falls back to the registry duration

- **WHEN** the Images playlist has no enabled, playable entry
- **THEN** the Images page SHALL use its configured registry duration
- **AND** the rotation behavior for the Images page SHALL be unchanged from the configured value

##### Example: disabled-only playlist keeps the registry duration

- **GIVEN** every Images playlist entry is disabled
- **AND** the Images page registry duration is 5 seconds
- **WHEN** the Images page rotation duration is derived
- **THEN** the effective rotation duration SHALL be 5 seconds
