## ADDED Requirements

### Requirement: Playback header reflects real connection status

The playback shell SHALL pass the live MQTT connection status to the header so the header connection badge reflects the real connection state. The header SHALL NOT display a hard-coded connected state when the real status is unknown or disconnected.

#### Scenario: Disconnected status shows a disconnected badge

- **WHEN** the live MQTT status reports the connection is not connected
- **THEN** the playback header connection badge SHALL show a disconnected state
- **AND** it SHALL NOT show a connected/Online state

##### Example: offline runtime does not pretend to be online

- **GIVEN** the live MQTT status is `connected=false`, `reason="offline"`, and `isHydrated=true`
- **WHEN** the playback shell resolves header connection metadata
- **THEN** the badge status SHALL be `disconnected`
- **AND** the badge label SHALL NOT be `Online`

#### Scenario: Status not yet known shows connecting

- **WHEN** the live MQTT status has not yet been received (not hydrated)
- **THEN** the playback header connection badge SHALL show a connecting state

##### Example: connection status mapping

| connected | reason         | isHydrated | Badge status  |
| --------- | -------------- | ---------- | ------------- |
| true      | connected      | true       | connected     |
| false     | reconnecting   | true       | connecting    |
| false     | offline        | true       | disconnected  |
| false     | (any)          | false      | connecting    |
| false     | mock           | true       | connected     |

### Requirement: Header does not display fabricated weather

The playback header SHALL NOT display weather information, because the system has no weather data source. The previously hard-coded weather value SHALL be removed.

#### Scenario: No weather element is rendered

- **WHEN** the playback header renders
- **THEN** it SHALL NOT render any weather value
- **AND** it SHALL NOT render the previously hard-coded `晴 26°C` string
