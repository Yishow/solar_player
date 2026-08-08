## ADDED Requirements

### Requirement: Every route answers errors through one envelope

The server SHALL answer an uncaught error from any route with a single response shape carrying a failure indicator, an error string, and the response timestamp. This SHALL hold for every route the server exposes, not only routes registered after the envelope is installed.

Because a route plugin captures the error handler that exists at the moment it is registered, the envelope SHALL be installed before any route plugin is registered. A route plugin registered before the envelope would answer with the framework default instead, and that failure is silent — nothing about the route itself looks wrong. The ordering SHALL therefore be held by an automated check rather than by comment alone.

#### Scenario: An uncaught route error is answered through the envelope

- **WHEN** a route raises an error that it does not handle
- **THEN** the response SHALL carry the failure indicator, an error string, and the response timestamp
- **AND** the response SHALL NOT carry the framework's default error fields in their place

#### Scenario: The envelope covers routes regardless of registration order

- **WHEN** a route registered at any point during server construction raises an uncaught error
- **THEN** that error SHALL be answered through the envelope
- **AND** no route SHALL be able to fall back to the framework default by virtue of when it was registered

---

### Requirement: Internal exception detail never reaches the caller on a server error

When the resulting status is a server error, the envelope's error string SHALL be a fixed, non-revealing value. The raised exception's message SHALL NOT appear in any field of the response.

When the resulting status is a client error, the envelope's error string SHALL be that error's own message, because it describes what the caller did wrong rather than how the server is built.

#### Scenario: A server error hides the exception message

- **GIVEN** a route raises an exception whose message contains internal detail
- **WHEN** the resulting status is a server error
- **THEN** the error string SHALL be the fixed non-revealing value
- **AND** the exception's message SHALL NOT appear anywhere in the response body

##### Example: A thrown parse failure does not disclose its message

- **GIVEN** a route raises an error whose message names an internal file, query, or stored value
- **WHEN** the caller reads the response
- **THEN** the caller learns only that the server failed
- **AND** the detail is available to the operator through the server log instead

#### Scenario: A client error keeps its own message

- **WHEN** a route raises an error carrying a client-error status
- **THEN** the error string SHALL be that error's message
- **AND** the caller SHALL be able to act on it

---

### Requirement: A management-only read may disclose stored-content corruption

A route that already requires a trusted management caller MAY answer a server error with the detail describing how stored content is corrupt, so that an operator can diagnose it. Such a route SHALL produce that detail itself rather than relying on the envelope being absent.

A route reachable without management trust SHALL NOT disclose that detail. Where the same stored content is readable through both a public and a management-only route, only the management-only route SHALL carry the detail.

#### Scenario: Management-only read discloses the corruption detail

- **GIVEN** stored configuration is corrupt
- **WHEN** a trusted management caller reads it through the management-only route
- **THEN** the response SHALL be a server error carrying the detail describing the corruption

#### Scenario: The public read of the same content stays opaque

- **GIVEN** the same stored configuration is corrupt
- **WHEN** a caller reads it through the publicly reachable route
- **THEN** the response SHALL be the envelope with the fixed non-revealing error string
- **AND** it SHALL NOT describe the corruption

#### Scenario: An untrusted caller is refused before any detail is produced

- **WHEN** a caller that does not satisfy the management access boundary requests the management-only route
- **THEN** the server SHALL refuse the request through that boundary
- **AND** SHALL NOT disclose the corruption detail
