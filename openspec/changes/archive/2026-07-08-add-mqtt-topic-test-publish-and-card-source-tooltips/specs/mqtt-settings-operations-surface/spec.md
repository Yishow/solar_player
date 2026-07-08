## ADDED Requirements

### Requirement: Publish numeric test values through existing MQTT topic mappings

The system SHALL let operators publish numeric test values from MQTT Settings through existing topic mappings without allowing arbitrary topic or payload publishing.

#### Scenario: Operator publishes a test value for an enabled mapping

- **WHEN** an operator enters `1200` for the `selfConsumptionEnergy` topic row and triggers test publish
- **THEN** the server SHALL publish the JSON payload `{ "value": 1200 }` to that row's configured MQTT topic
- **AND** the response SHALL identify the metric key, topic, payload, and current MQTT status

#### Scenario: Operator publishes a self-consumption dependency value

- **WHEN** an operator enters a numeric value for either `selfConsumptionEnergy` or `consumptionEnergy`
- **THEN** MQTT Settings SHALL use that row's configured topic mapping for publish
- **AND** the operator SHALL NOT need to type a custom topic or tag outside the mapping row

#### Scenario: Publish is rejected when the mapping is not publishable

- **WHEN** the requested metric key has no mapping, has a disabled mapping, has an empty topic, or the MQTT client is not connected
- **THEN** the server MUST reject the request with a non-2xx response
- **AND** MQTT Settings SHALL show the rejection message instead of reporting success

#### Scenario: Publish is rejected for invalid values

- **WHEN** the operator submits an empty value, non-numeric value, `NaN`, or an infinite number
- **THEN** the server MUST reject the request
- **AND** no MQTT payload SHALL be published
