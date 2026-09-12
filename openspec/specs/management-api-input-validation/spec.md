## Requirements

### Requirement: Management numeric resource identifiers are parsed strictly

Management API routes that address numeric resources SHALL accept only a complete canonical decimal positive integer that is within JavaScript's safe integer range. Routes SHALL NOT use partial numeric parsing that accepts a valid prefix followed by invalid characters. A malformed identifier SHALL return HTTP 400 without reading, mutating, deleting, or emitting events for the resource represented by any numeric prefix. A syntactically valid identifier whose resource does not exist SHALL return HTTP 404.

#### Scenario: Numeric prefix with trailing text is rejected

- **GIVEN** resource id 12 exists
- **WHEN** a caller sends a covered management request using path id `12abc`
- **THEN** the server SHALL return 400
- **AND** resource 12 SHALL NOT be read as the target of the mutation or deletion
- **AND** no mutation or display-sync event SHALL be emitted for resource 12

#### Scenario: Non-canonical numeric forms are rejected

- **WHEN** a covered route receives `12.0`, `+12`, `0`, a negative value, whitespace-only input, or a value above `Number.MAX_SAFE_INTEGER`
- **THEN** the server SHALL return 400
- **AND** it SHALL perform no persistence side effect for that request

#### Scenario: Valid missing identifier is not found

- **WHEN** a covered route receives a valid positive integer id for a resource that does not exist
- **THEN** the server SHALL return 404 rather than a successful HTTP status carrying `success:false`

#### Scenario: Raw request path does not bypass the matched resource validator

- **GIVEN** numeric resource 12 exists on a covered Circuit, Image, Brand, or Display Ops route
- **WHEN** a raw HTTP request supplies a literal backslash followed by text in that resource parameter, such as `/api/circuits/12\abc`
- **THEN** validation SHALL follow the matched route and actual resource parameter and return HTTP 400
- **AND** resource 12, files, playlist state, and mutation or display-sync events SHALL remain unchanged


<!-- @trace
source: fix-reviewed-input-boundary-regressions
updated: 2026-09-12
code:
  - apps/server/src/plugins/managementInputValidation.ts
  - apps/server/src/plugins/runtimeInputValidation.ts
  - apps/server/src/plugins/inputValidationSupport.ts
tests:
  - apps/server/src/routes/management-input-validation.test.ts
-->

---
### Requirement: Circuit mutations validate the complete persisted candidate

Circuit create and update operations SHALL validate the complete candidate row before writing it. Create SHALL validate after applying documented defaults; update SHALL merge the requested patch with the existing row and validate the merged candidate so cross-field rules cannot be bypassed by a partial body. The candidate SHALL require a non-empty Chinese name, a finite non-negative rated capacity, a non-negative safe-integer display order, a valid nullable display slot, and finite thresholds satisfying `normalMin <= normalMax <= attentionMin <= attentionMax <= warningMin <= warningMax`. An invalid candidate SHALL return HTTP 400 and SHALL NOT change the database or emit circuit/display-sync mutation events.

#### Scenario: Partial update cannot create an invalid threshold order

- **GIVEN** an existing valid circuit
- **WHEN** a partial update would make any threshold band lower than the preceding bound
- **THEN** the server SHALL return 400
- **AND** the stored row SHALL remain unchanged
- **AND** no circuit-settings-updated or display-sync event SHALL be emitted

#### Scenario: Valid partial circuit update remains supported

- **GIVEN** an existing valid circuit
- **WHEN** a partial update produces a complete candidate satisfying all circuit invariants
- **THEN** the server SHALL persist the candidate and preserve the existing success response and update events

---
### Requirement: Image metadata mutations reject invalid runtime values

Image metadata update operations SHALL validate provided runtime values before persistence. `displayDuration` SHALL be a safe integer of at least 1 second; `aspectRatio` SHALL be a finite positive number; `category` and `usageScope` SHALL belong to the shared supported sets; boolean fields SHALL be booleans rather than truthy coercions. Invalid metadata SHALL return HTTP 400 without changing the image row, playlist state, files, cover state, or image/display-sync events.

#### Scenario: Negative display duration is rejected

- **GIVEN** an existing image asset
- **WHEN** the caller updates it with `displayDuration <= 0`
- **THEN** the server SHALL return 400
- **AND** image metadata and playlist behavior SHALL remain unchanged

#### Scenario: Unknown managed asset enum is rejected

- **WHEN** an image update contains an unsupported category or usage scope
- **THEN** the server SHALL return 400
- **AND** the unsupported value SHALL NOT be stored

---
### Requirement: Circuit and image reorder requests are validated atomically

Circuit and image reorder operations SHALL validate the entire submitted collection before starting persistence. Every item SHALL have a valid strict positive resource id and a non-negative safe-integer display order; resource ids SHALL be unique within the request and every referenced resource SHALL exist. If any item fails validation, the whole request SHALL return HTTP 400 and SHALL NOT change any order or emit reorder/display-sync events. A valid subset reorder MAY update only the submitted resources; the request is not required to enumerate the entire catalog.

#### Scenario: One unknown id rejects the whole reorder

- **GIVEN** a reorder request contains several valid ids and one unknown id
- **WHEN** the request is handled
- **THEN** the server SHALL return 400 before applying any submitted order
- **AND** every previously stored order SHALL remain unchanged
- **AND** no reorder or display-sync event SHALL be emitted

#### Scenario: Duplicate id rejects the whole reorder

- **WHEN** the same resource id appears more than once in one reorder payload
- **THEN** the server SHALL return 400
- **AND** no order SHALL be changed

---
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


<!-- @trace
source: harden-runtime-input-boundaries
updated: 2026-09-12
code:
  - apps/server/src/app.ts
  - apps/server/src/plugins/runtimeInputValidation.ts
tests:
  - apps/server/src/routes/runtime-input-boundaries.test.ts
-->

---
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


<!-- @trace
source: harden-runtime-input-boundaries
updated: 2026-09-12
code:
  - apps/server/src/plugins/runtimeInputValidation.ts
  - apps/server/src/mqtt/settings-source.ts
  - apps/web/src/pages/MqttSettings/mqttSettingsRouteModel.ts
tests:
  - apps/server/src/routes/runtime-input-boundaries.test.ts
  - apps/server/src/mqtt/settings-source.test.ts
  - apps/web/src/pages/MqttSettings/mqttSettingsRouteModel.test.ts
-->

---
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

<!-- @trace
source: harden-runtime-input-boundaries
updated: 2026-09-12
code:
  - apps/server/src/plugins/runtimeInputValidation.ts
tests:
  - apps/server/src/routes/image-playlist-input-validation.test.ts
  - apps/server/src/routes/image-playlist.test.ts
-->
