## ADDED Requirements

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
