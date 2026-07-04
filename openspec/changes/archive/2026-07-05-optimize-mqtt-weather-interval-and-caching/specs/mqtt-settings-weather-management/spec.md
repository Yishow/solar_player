## MODIFIED Requirements

### Requirement: Configure weather settings from MQTT Settings

The system SHALL allow operators to configure header weather behavior and update interval directly from `MQTT Settings`.

#### Scenario: Operator edits weather behavior in the management page

- **WHEN** an operator opens `MQTT Settings`
- **THEN** the page SHALL provide controls for enabling weather, selecting a location mode, choosing a county or station, selecting a preset, choosing an update interval (10 minutes, 30 minutes, 1 hour, 3 hours, 6 hours, 12 hours, or manual), and editing custom field choices
- **AND** the operator SHALL NOT need to navigate to a separate management route to perform those weather-setting tasks

## ADDED Requirements

### Requirement: Support manual weather refresh

The system SHALL allow operators to manually trigger a weather refresh from MQTT Settings.

#### Scenario: Operator triggers manual refresh

- **WHEN** the operator clicks the "Refresh Now" button
- **THEN** the system SHALL clear the server cache and request fresh weather data from CWA API
- **AND** the page SHALL display the refreshed preview or feedback immediately

### Requirement: Support server-side weather caching and MQTT broadcast

The server SHALL cache CWA weather data based on the configured update interval and broadcast successfully fetched weather to the local MQTT broker.

#### Scenario: Server returns cached weather data

- **WHEN** a client requests current weather data within the configured update interval
- **THEN** the server SHALL return the cached weather snapshot
- **AND** it SHALL NOT send a new API request to the CWA service

#### Scenario: Server broadcasts weather to local broker

- **WHEN** the server successfully fetches new weather data from the CWA API
- **THEN** the server SHALL publish the weather snapshot JSON to the local MQTT broker on the topic `solar/weather/current`
- **AND** the payload SHALL conform to the standard WeatherCurrentSnapshot schema
