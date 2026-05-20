## ADDED Requirements

### Requirement: Provide ESM-safe Device Status log access

The system SHALL provide recent log listing and export metadata for `Device Status` through routes that remain safe to call in the current server runtime.

#### Scenario: Operator reads recent logs

- **WHEN** the operator requests recent device logs from `Device Status`
- **THEN** the server SHALL return a safe listing of recent log files or a bounded error envelope
- **AND** the route SHALL remain callable in the current Node ESM server runtime

##### Example: Missing log directory returns a safe error

- **GIVEN** the configured log directory does not exist
- **WHEN** the operator requests log export metadata
- **THEN** the API returns the existing safe error envelope for missing logs
- **AND** the route does not fail because of an incompatible module access pattern
