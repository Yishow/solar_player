## ADDED Requirements

### Requirement: Playback management mutations reject malformed runtime values and preserve omitted fields

Playback settings and playback page mutation routes SHALL validate HTTP runtime values before persistence. TypeScript request types SHALL NOT be treated as runtime validation. For partial updates, an omitted field SHALL preserve the existing persisted value; the server SHALL NOT substitute a route-local default for an omitted field. A supplied invalid field SHALL return HTTP 400 before database writes or playback/display-sync events.

#### Scenario: Duration-only playback page patch preserves other fields

- **GIVEN** an existing playback page has `enabled=false`, `displayOrder=4`, and `durationSeconds=15`
- **WHEN** a trusted caller updates that page with only a valid `durationSeconds=30`
- **THEN** the server SHALL persist `durationSeconds=30`
- **AND** `enabled` SHALL remain false
- **AND** `displayOrder` SHALL remain 4

#### Scenario: Wrong-type playback boolean is rejected

- **WHEN** a playback settings request supplies `autoplay` as the string `"false"`
- **THEN** the server SHALL return 400
- **AND** it SHALL NOT coerce the string into a boolean
- **AND** the prior playback settings SHALL remain unchanged
- **AND** no playback-settings-updated or display-sync event SHALL be emitted

#### Scenario: Enabled schedule requires valid clock values

- **WHEN** a playback settings candidate enables scheduling but has a missing or malformed start or end time
- **THEN** the server SHALL return 400
- **AND** it SHALL preserve the prior schedule settings

### Requirement: MQTT settings partial updates preserve existing mode and enforce numeric bounds

MQTT settings mutations SHALL treat omitted fields as unchanged. `dataMode` SHALL accept only `mqtt` or `mock`. `port` SHALL be an integer from 1 through 65535; `messageTimeout` SHALL be a positive integer; `reconnectInterval` SHALL be a non-negative integer. Required text fields such as host and clientId SHALL be non-empty after trimming. Invalid supplied values SHALL return HTTP 400 before persistence or MQTT reconnect side effects.

#### Scenario: Partial MQTT update keeps mock mode

- **GIVEN** persisted MQTT settings use `dataMode=mock`
- **WHEN** a trusted caller updates only host, port, message timeout, or reconnect interval and omits `dataMode`
- **THEN** the persisted dataMode SHALL remain `mock`
- **AND** the server SHALL NOT switch to MQTT mode merely because dataMode was omitted

#### Scenario: Partially numeric MQTT port is rejected

- **WHEN** a caller attempts to submit a port value derived from malformed input such as `1883abc`
- **THEN** the server SHALL reject the invalid runtime value rather than silently normalizing it to 1883
- **AND** the prior MQTT settings SHALL remain unchanged
- **AND** no reconnect SHALL be triggered

#### Scenario: Out-of-range MQTT numbers are rejected

- **WHEN** port is 0, negative, above 65535, or non-integer, or reconnect interval is negative, or message timeout is non-positive
- **THEN** the server SHALL return 400
- **AND** it SHALL perform no MQTT settings persistence or reconnect side effect

### Requirement: Image playlist governance mutations are validated before persistence

Image playlist entry, settings, duration-all, and reorder mutations SHALL validate the complete submitted values before persistence. Duration seconds SHALL be a positive safe integer, display order SHALL be a non-negative safe integer, boolean fields SHALL be booleans, fallback mode SHALL belong to the supported shared set, a non-null asset id SHALL reference an existing image asset, and reorder entry ids SHALL exist and SHALL NOT be duplicated within the same request. Any invalid bulk request SHALL fail atomically with HTTP 400 before database writes or image/display-sync events.

#### Scenario: Invalid playlist duration is rejected

- **GIVEN** an existing playlist entry
- **WHEN** a caller supplies duration 0, a negative value, or a fractional value
- **THEN** the server SHALL return 400
- **AND** the stored entry SHALL remain unchanged
- **AND** no playlist or display-sync event SHALL be emitted

#### Scenario: Unknown playlist asset is rejected

- **WHEN** a playlist entry update references a non-null asset id that does not exist
- **THEN** the server SHALL return 400 or 404 according to the resource-not-found convention used by the route
- **AND** it SHALL NOT persist the dangling reference

#### Scenario: Invalid reorder rejects the entire collection

- **GIVEN** a reorder request contains several valid entries and one unknown or duplicate entry id
- **WHEN** the request is handled
- **THEN** the entire request SHALL be rejected before applying any order
- **AND** every previously stored order SHALL remain unchanged
- **AND** no image or display-sync event SHALL be emitted
