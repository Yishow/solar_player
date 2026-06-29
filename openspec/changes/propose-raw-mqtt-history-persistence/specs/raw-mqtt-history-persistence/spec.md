## ADDED Requirements

### Requirement: Persist raw MQTT messages as a separate local audit lane
The system SHALL support persisting raw MQTT messages as a separate local audit lane alongside the existing latest-value and snapshot pipeline.

#### Scenario: Runtime ingestion writes a raw message
- **WHEN** a subscribed MQTT topic message is received
- **THEN** the system SHALL be able to persist the raw topic, payload, and receive timestamp to local storage
- **AND** that persistence SHALL NOT replace the existing latest-value or snapshot writes

#### Scenario: Raw-history failure does not block the current runtime lane
- **WHEN** raw-history persistence fails for a received MQTT message
- **THEN** the system SHALL continue processing the existing latest-value and snapshot pipeline
- **AND** the raw-history failure SHALL remain diagnosable

### Requirement: Bound retention and query scope for raw MQTT history
The system SHALL define retention and query boundaries for raw MQTT history before exposing it to operators or tools.

#### Scenario: Retention policy trims old raw messages
- **WHEN** raw MQTT history exceeds the configured retention boundary
- **THEN** the system SHALL remove or archive older rows according to that policy
- **AND** the retention behavior SHALL be deterministic and reviewable

#### Scenario: Query access stays bounded
- **WHEN** an operator or tool queries raw MQTT history
- **THEN** the query SHALL be filterable by topic and time range
- **AND** the query SHALL enforce bounded result windows rather than unbounded full-table reads

### Requirement: Protect sensitive payload content in operator-facing access
The system SHALL define how raw MQTT payload access avoids accidental disclosure of sensitive content.

#### Scenario: Operator views raw MQTT history
- **WHEN** an operator-facing surface exposes raw MQTT history
- **THEN** the system SHALL define whether the payload is shown in full, summarized, or masked
- **AND** that rule SHALL be consistent across read and export paths
