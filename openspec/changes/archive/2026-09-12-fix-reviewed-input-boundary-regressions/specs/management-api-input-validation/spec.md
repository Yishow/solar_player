## MODIFIED Requirements

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
