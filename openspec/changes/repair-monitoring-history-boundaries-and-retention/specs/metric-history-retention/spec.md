## ADDED Requirements

### Requirement: Retention windows are validated before destructive maintenance

Explicit metric snapshot and daily summary retention configuration SHALL be positive whole-day integers, and the system SHALL fail closed before a retention worker can delete data when an explicit value is invalid.

#### Scenario: Negative retention value is configured

- **WHEN** `METRIC_SNAPSHOT_RETENTION_DAYS` or `DAILY_SUMMARY_RETENTION_DAYS` is explicitly configured with a negative value
- **THEN** server startup SHALL reject the configuration before the retention worker starts
- **AND** no retention DELETE or VACUUM SHALL run from that invalid configuration

#### Scenario: Zero, fractional, or non-numeric retention is configured

- **WHEN** an explicit retention value is zero, fractional, or non-numeric
- **THEN** the configuration SHALL be rejected with an operator-readable error identifying the affected setting

#### Scenario: Retention value is omitted

- **WHEN** a retention environment variable is not set
- **THEN** the system SHALL continue to use the documented default window for that data set
