## ADDED Requirements

### Requirement: Identify the source of each weather operation result

The trusted weather diagnostic SHALL identify whether the latest operation result came from a live upstream response, cache, stale fallback, or no available snapshot while keeping public weather contracts free of diagnostic details.

#### Scenario: Upstream returns a structurally invalid success document

- **WHEN** CWA responds with HTTP 200 but `records.Station` is missing or is not an array
- **THEN** the operation SHALL fail with `WEATHER_INVALID_PAYLOAD`
- **AND** it SHALL NOT expose a fresh empty station/options result

#### Scenario: Manual refresh reaches CWA

- **WHEN** a trusted manual refresh completes with a valid CWA response
- **THEN** the latest diagnostic SHALL report `state: ok` and `source: upstream`
- **AND** the diagnostic occurrence time SHALL describe that refresh attempt

#### Scenario: Upstream fails while a stale snapshot is available

- **WHEN** a weather request fails and the service returns its last successful snapshot
- **THEN** the latest diagnostic SHALL retain the bounded transport failure and report `source: stale`
- **AND** the diagnostic SHALL preserve `lastSuccessAt`

#### Scenario: A normal read is served from cache

- **WHEN** a non-refresh weather read returns an unexpired cached snapshot without contacting CWA
- **THEN** the operation result SHALL be distinguishable as `source: cache`
- **AND** it SHALL NOT replace the occurrence time of the latest upstream attempt
