## ADDED Requirements

### Requirement: Keep runtime image playlist reads side-effect free
The system SHALL keep runtime image playlist reads side-effect free so playback hydration does not create or mutate governance rows.

#### Scenario: Playback reads the image playlist before governance bootstrap
- **GIVEN** no persisted image playlist rows exist yet
- **WHEN** a playback or preview runtime requests the resolved image playlist
- **THEN** the server SHALL return a resolved runtime playlist payload
- **AND** it SHALL NOT create `image_playlist_entries` rows as a side effect of that read

##### Example: Initial runtime hydration does not write governance rows
- **GIVEN** image assets exist but the governance table is empty
- **WHEN** the runtime requests `GET /api/image-playlist`
- **THEN** the response includes the resolved playlist view
- **AND** the governance table remains unchanged after the request
