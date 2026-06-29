## ADDED Requirements

### Requirement: Expose a read-only data source overview page

The system SHALL provide `/settings/data-source` as a management page that summarizes the current runtime data sources without modifying those sources.

#### Scenario: Operator opens the data source settings page

- **WHEN** a trusted management operator opens `/settings/data-source`
- **THEN** the page SHALL show Runtime SQLite, image uploads, brand uploads, MQTT, weather source, history retention, and browser-local cache categories
- **AND** the page SHALL show clear navigation actions to the existing settings or diagnostics pages that manage those categories

#### Scenario: Data source page has degraded diagnostics

- **WHEN** the diagnostics API is unavailable or returns an error
- **THEN** the page SHALL remain visible
- **AND** it SHALL show a degraded diagnostics state instead of implying that all data sources are healthy

### Requirement: Provide a management-protected diagnostics API

The system SHALL expose a management-protected read-only diagnostics API for data source overview payloads.

#### Scenario: Trusted caller requests data source diagnostics

- **WHEN** a trusted management caller requests the data source diagnostics API
- **THEN** the response SHALL include configured runtime paths, SQLite table counts, upload file summaries, MQTT data mode, retention configuration, and related management route links
- **AND** the response SHALL identify unavailable sections without failing the entire payload when a non-critical summary cannot be read

#### Scenario: Untrusted caller requests data source diagnostics

- **WHEN** a caller does not satisfy the existing management read boundary
- **THEN** the API SHALL deny the request
- **AND** it SHALL NOT expose runtime paths, table counts, filenames, or source configuration details

### Requirement: Redact secrets from data source diagnostics

The system SHALL NOT return secrets from the data source diagnostics API or data source settings page.

#### Scenario: MQTT and weather settings include secrets

- **WHEN** MQTT password, management token, or CWA authorization values are configured
- **THEN** the diagnostics payload SHALL NOT include the secret values
- **AND** the page SHALL display only non-secret status such as configured, missing, masked, or unavailable

### Requirement: Present recommendations without implementing new connectors

The system SHALL present recommended future maintenance capabilities separately from implemented controls.

#### Scenario: Operator reviews recommended data source work

- **WHEN** the operator views the recommendation section
- **THEN** the page SHALL list runtime state export, database backup and restore, health check, and external database connector evaluation as recommendations
- **AND** the page SHALL NOT present PostgreSQL, MySQL, or remote database connector setup as an implemented control
