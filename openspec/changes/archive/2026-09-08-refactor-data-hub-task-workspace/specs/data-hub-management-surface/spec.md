## MODIFIED Requirements

### Requirement: Data Hub separates connection, source, metric, usage, diagnostics, and external-data concerns
<!-- requirement-id: U1-M1 -->

The management application SHALL provide a task-oriented Data Hub landing workspace for connecting a source, editing existing data and diagnosing unavailable data. It SHALL retain direct navigable areas for Connections, Sources, Metrics and External Data. Metrics SHALL continue to consolidate metric usage and diagnostics. Legacy usage and diagnostics URLs SHALL redirect to the consolidated Metrics workspace while preserving scope and metric filters. Chinese task labels SHALL clarify operator intent without changing metric identities, device credentials or the distinction between shared infrastructure and site-specific data.

#### Scenario: Operator opens Data Hub
<!-- scenario-id: U1-M1-S01 -->

- **GIVEN** an authorized operator opens /settings/data-hub
- **WHEN** the root workspace renders
- **THEN** it presents three task entries and direct access to the four specialist areas

#### Scenario: Legacy usage or diagnostic link
<!-- scenario-id: U1-M1-S02 -->

- **GIVEN** a bookmark requests usage or diagnostics with KN and a metric filter
- **WHEN** the application redirects
- **THEN** Metrics opens with the original scope and metric filters preserved

#### Scenario: One shared broker
<!-- scenario-id: U1-M1-S03 -->

- **GIVEN** CL and KN use the same central MQTT broker
- **WHEN** the operator opens Connections while viewing KN data
- **THEN** the interface identifies the broker as shared infrastructure rather than claiming the change affects KN alone
