## MODIFIED Requirements

### Requirement: Provide ESM-safe Device Status log access

The system SHALL provide bounded recent solar-display journald records and a bounded text export for Device Status through routes that remain safe to call in the current Node ESM runtime. Those routes SHALL only expose log evidence to trusted management callers.

#### Scenario: Operator reads recent production logs

- **WHEN** a trusted management caller requests recent device logs from Device Status
- **THEN** the server reads only the solar-display systemd unit
- **AND** the response identifies source as journald
- **AND** the response includes available status, bounded entries, retention boundary, and an unavailable reason that is null

##### Example: Recent log response shape

- **GIVEN** the journal contains one solar-display error record
- **WHEN** the operator requests GET /api/device/logs?limit=20
- **THEN** the JSON data contains source, available, entries, retention, and unavailableReason
- **AND** the error record includes timestamp, priority, and message without host file paths

#### Scenario: Operator exports bounded logs

- **WHEN** a trusted management caller requests GET /api/device/logs/export with a valid bounded limit
- **THEN** the server returns text/plain content from only the solar-display unit
- **AND** Content-Disposition identifies a downloadable bounded log export
- **AND** the export never exceeds the configured maximum record count

#### Scenario: Journal is unavailable

- **WHEN** journal access is absent or the solar-display unit cannot be read
- **THEN** the API returns a bounded unavailable response with source journald and a non-empty reason
- **AND** it does not return a successful empty file listing
- **AND** the route remains callable in the current Node ESM server runtime

#### Scenario: Untrusted caller is denied log evidence

- **WHEN** an untrusted caller requests device log entries or export content
- **THEN** the server SHALL return an explicit denied response
- **AND** it SHALL NOT execute journal export for the caller
- **AND** it SHALL NOT expose log content, retention metadata, or host paths
