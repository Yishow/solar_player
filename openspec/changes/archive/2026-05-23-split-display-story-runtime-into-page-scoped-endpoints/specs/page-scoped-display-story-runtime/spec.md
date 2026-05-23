## ADDED Requirements

### Requirement: Expose page-scoped display story runtime endpoints

The system SHALL expose `GET /api/display-story/:pageId` for the monitoring pages `overview`, `solar`, and `factory-circuit`, and each response SHALL contain only the requested page payload plus page-scoped metadata.

#### Scenario: Overview runtime requests only overview payload

- **WHEN** a client requests `GET /api/display-story/overview`
- **THEN** the response includes `pageId = "overview"`, `generatedAt`, and the `overview` story payload under `payload`
- **AND** the response SHALL NOT include sibling payloads for `solar` or `factory-circuit`

##### Example: Overview endpoint omits unrelated pages

- **GIVEN** the monitoring story service can compute `overview`, `solar`, and `factory-circuit`
- **WHEN** the client requests `GET /api/display-story/overview`
- **THEN** the response body contains only the `overview` payload wrapper
- **AND** the client does not need to extract `overview` from an aggregate response

#### Scenario: Unsupported page ids are rejected

- **WHEN** a client requests `GET /api/display-story/images`
- **THEN** the route rejects the request with the existing API error conventions
- **AND** no monitoring story payload is returned

### Requirement: Keep aggregate display story route compatible during migration

The system SHALL keep `GET /api/display-story` available during the migration to page-scoped runtime endpoints, and the aggregate route SHALL remain equivalent to composing the page-scoped readers for `overview`, `solar`, and `factory-circuit`.

#### Scenario: Aggregate consumers continue receiving the legacy shape

- **WHEN** an existing client requests `GET /api/display-story`
- **THEN** the response still contains `generatedAt`, `overview`, `solar`, and `factoryCircuit`
- **AND** each page payload matches the corresponding page-scoped reader output for the same source snapshot
