## ADDED Requirements

### Requirement: Weather cache identity follows the effective location selection

Cached current weather and stale fallback data SHALL only be reused for the same normalized weather location selection that produced them.

#### Scenario: Operator previews a different station while old cache is fresh

- **GIVEN** a fresh cached snapshot exists for station A
- **WHEN** the operator changes the pending weather selection to station B and requests preview
- **THEN** the preview SHALL NOT return station A's cached snapshot
- **AND** it SHALL return station B data from station B cache/upstream or an explicit unavailable state

#### Scenario: New location fetch fails

- **GIVEN** a last-success snapshot exists for location A but none exists for location B
- **WHEN** a current or preview request for location B fails upstream
- **THEN** the system SHALL NOT expose location A as stale fallback for location B
- **AND** the location B result SHALL be unavailable unless location B has its own last-success snapshot

### Requirement: Weather cache invalidation follows saved and manual-refresh selection

The system SHALL invalidate or bypass cache entries according to the location being saved or manually refreshed rather than treating all weather requests as one shared cache.

#### Scenario: Saved station changes

- **WHEN** weather settings are saved with a different effective station or county selection
- **THEN** the next playback weather read SHALL evaluate cache identity against the new selection
- **AND** a cache entry from the previous selection SHALL NOT satisfy that read

#### Scenario: Operator requests manual refresh

- **WHEN** a trusted operator requests manual weather refresh
- **THEN** the server SHALL bypass the cached snapshot for the currently saved selection and perform one fresh upstream attempt
