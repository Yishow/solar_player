## MODIFIED Requirements

### Requirement: Extend Device Status with display operations summary
The system SHALL extend `Device Status` with display operations summary so trusted management operators can see current live display state alongside host health, and untrusted callers SHALL NOT receive the full management summary payload.

#### Scenario: Device Status shows latest live display state
- **WHEN** a trusted management caller opens `Device Status`
- **THEN** the page shows a summary of live display version, recent publish state, or pending draft backlog
- **AND** those display-operation values remain distinct from raw host metrics

##### Example: Trusted operator sees current display summary
- **GIVEN** the caller satisfies the management read boundary
- **WHEN** the page requests the device display operations summary
- **THEN** the API returns the current live display summary
- **AND** the response keeps publish, skip, and draft backlog data distinct from host health metrics

#### Scenario: Untrusted caller is denied management display summary
- **WHEN** an untrusted caller requests the device display operations summary
- **THEN** the server SHALL return a denied response or an explicitly access-denied state
- **AND** it SHALL NOT expose the full publish, skip, and draft backlog details

##### Example: Playback-safe caller does not receive operator summary details
- **GIVEN** the request is not trusted for management reads
- **WHEN** the caller requests `GET /api/device-display-ops`
- **THEN** the API indicates access is denied for the operator summary
- **AND** the response does not include the full management display operations payload
