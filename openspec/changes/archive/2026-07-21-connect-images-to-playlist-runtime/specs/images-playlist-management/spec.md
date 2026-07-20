## ADDED Requirements

### Requirement: Drive Images playback from ordered playlist runtime entries

The implementation SHALL make the `/images` playback route consume ordered `/api/image-playlist` entries and the resolved active entry as its primary runtime instead of building playback content only from page-local mock data.

#### Scenario: Images playback loads playlist entries

- **WHEN** `/images` requests the image playlist runtime
- **THEN** the page resolves thumbnail order, active slide, and per-entry duration from the playlist payload
- **AND** the existing FHD main stage and thumbnail layout remain unchanged

##### Example: Ordered entries control the active slide

- **GIVEN** `/api/image-playlist` returns four enabled entries with explicit display order and durations
- **WHEN** `/images` renders the playback page
- **THEN** the thumbnail order and active slide counter follow that playlist order
- **AND** the page does not rebuild a separate mock-only image sequence

### Requirement: Apply playlist fallback behavior in the playback route

The implementation SHALL make the `/images` playback route honor playlist fallback mode and fallback reason when the active entry cannot display its primary asset.

#### Scenario: Active image asset is missing

- **WHEN** the active playlist entry resolves to a missing or pending asset
- **THEN** the playback page applies the configured playlist fallback behavior
- **AND** the slide remains readable instead of breaking the layout

##### Example: Use-cover fallback keeps the page playable

- **GIVEN** the active entry is configured with `fallbackMode = use-cover` and its asset is missing
- **WHEN** `/images` resolves the active playback entry
- **THEN** the main stage uses the cover asset as the playback source
- **AND** the metadata panel still reflects the active playlist entry rather than pretending the missing asset never existed
