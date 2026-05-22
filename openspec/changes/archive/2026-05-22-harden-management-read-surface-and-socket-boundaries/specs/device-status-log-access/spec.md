## MODIFIED Requirements

### Requirement: Provide ESM-safe Device Status log access
The system SHALL provide recent log listing and export metadata for `Device Status` through routes that remain safe to call in the current server runtime, and those routes SHALL only expose log metadata to trusted management callers.

#### Scenario: Operator reads recent logs
- **WHEN** a trusted management caller requests recent device logs from `Device Status`
- **THEN** the server SHALL return a safe listing of recent log files or a bounded error envelope
- **AND** the route SHALL remain callable in the current Node ESM server runtime

##### Example: Missing log directory returns a safe error
- **GIVEN** the configured log directory does not exist
- **AND** the caller is trusted for management reads
- **WHEN** the operator requests log export metadata
- **THEN** the API returns the existing safe error envelope for missing logs
- **AND** the route does not fail because of an incompatible module access pattern

#### Scenario: Untrusted caller is denied log metadata
- **WHEN** an untrusted caller requests device log listing or export metadata
- **THEN** the server SHALL return an explicit denied response
- **AND** it SHALL NOT expose log directory or file listing metadata

##### Example: Non-management caller cannot enumerate log files
- **GIVEN** the request does not come from loopback, a trusted management origin, or a valid management access token
- **WHEN** the caller requests `GET /api/device/logs/export`
- **THEN** the server returns a denied response
- **AND** the response does not include the log directory path or file names
