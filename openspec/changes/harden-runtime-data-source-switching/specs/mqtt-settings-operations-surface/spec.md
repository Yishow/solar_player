## ADDED Requirements

### Requirement: Partial MQTT settings updates preserve omitted fields

The system SHALL treat omitted fields in an MQTT settings mutation as unchanged rather than replacing them with protocol defaults.

#### Scenario: Data mode is omitted from a partial update

- **WHEN** the current desired data mode is `mock` and a trusted mutation changes only another broker field without providing `dataMode`
- **THEN** the persisted desired data mode SHALL remain `mock`
- **AND** the mutation SHALL NOT initiate an implicit switch to MQTT

#### Scenario: Empty settings update is submitted

- **WHEN** a trusted mutation submits an empty MQTT settings body
- **THEN** all persisted MQTT settings SHALL remain unchanged

### Requirement: MQTT Settings distinguishes desired and active source state

The MQTT Settings surface SHALL show whether a saved source mode is active, transitioning, or failed to activate.

#### Scenario: Saved MQTT configuration is not yet active

- **WHEN** desired mode is MQTT but runtime remains on mock because activation failed or is still pending
- **THEN** the page SHALL show both desired MQTT and active mock state
- **AND** it SHALL present a bounded transition reason without implying that the runtime is already using MQTT
