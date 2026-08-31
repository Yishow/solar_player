## MODIFIED Requirements

### Requirement: Configure weather settings from MQTT Settings

The system SHALL allow operators to configure header weather behavior and update interval from the Data Hub `External Data` → Weather management area. Weather configuration SHALL no longer require the operator to treat Weather as part of MQTT broker/topic management.

#### Scenario: Operator edits weather behavior in the management page

- **WHEN** an operator opens Data Hub `External Data` → Weather
- **THEN** the page SHALL provide controls for enabling weather, selecting a location mode, choosing a county or station, selecting a preset, choosing an update interval (10 minutes, 30 minutes, 1 hour, 3 hours, 6 hours, 12 hours, or manual), and editing custom field choices
- **AND** the operator SHALL NOT need to navigate to MQTT broker/topic settings to perform those weather-setting tasks

### Requirement: Support presets with a custom-field fallback

The system SHALL support weather field presets and a custom-field mode in the Data Hub External Data Weather area.

#### Scenario: Operator selects a preset

- **WHEN** the operator switches to a named preset such as compact, standard, or complete
- **THEN** the page SHALL apply the preset's field list to the weather preview and pending settings
- **AND** it SHALL NOT require the operator to re-check every field manually

#### Scenario: Operator selects custom mode

- **WHEN** the operator switches to custom mode
- **THEN** the page SHALL expose explicit field selection controls
- **AND** the resulting field list SHALL drive the weather preview and saved settings

### Requirement: Persist MQTT and weather settings before broker reconnect outcome

The system SHALL persist MQTT broker settings before a broker reconnect attempt determines the MQTT save result, and SHALL persist Weather settings independently of MQTT broker reconnect state. Saving Weather settings MUST NOT require or trigger a broker reconnect solely because the Weather controls previously shared the MQTT management surface.

#### Scenario: Reconnect fails after settings are saved
- **WHEN** an operator saves MQTT broker settings and the background broker reconnect attempt fails
- **THEN** the save request SHALL still succeed with the persisted MQTT settings payload
- **AND** a later settings read SHALL return the saved MQTT values
- **AND** independently persisted Weather settings SHALL remain unchanged

#### Scenario: Save contract stays narrow to persistence
- **WHEN** an operator saves MQTT broker settings while the broker is unhealthy
- **THEN** the system SHALL NOT discard the saved MQTT settings because of the reconnect failure
- **AND** broker-health feedback SHALL remain visible through existing diagnostics rather than the save response itself

#### Scenario: Weather save is independent from broker health
- **WHEN** an operator saves valid Weather settings while the MQTT broker is unhealthy
- **THEN** the Weather save SHALL succeed according to Weather validation/persistence rules
- **AND** the Weather save SHALL NOT fail merely because the MQTT broker cannot reconnect

### Requirement: Support manual weather refresh

The system SHALL allow trusted operators to manually trigger a live weather refresh from the Data Hub External Data Weather area and SHALL distinguish the result of that upstream attempt from cached or stale playback data.

#### Scenario: Operator triggers manual refresh successfully

- **WHEN** the operator clicks the "Refresh Now" button and CWA returns valid current weather
- **THEN** the system SHALL clear the server cache and complete one fresh CWA request
- **AND** the page SHALL display an upstream-success result for that attempt immediately

#### Scenario: Manual refresh cannot reach CWA

- **WHEN** the operator clicks the "Refresh Now" button and the upstream request fails
- **THEN** the page SHALL display the bounded diagnostic code, failure stage, retryability, and stale-data availability for that attempt
- **AND** it SHALL NOT replace the failure with a generic delayed-data message
- **AND** if existing stale weather data remains visible, it SHALL be explicitly labelled as stale

### Requirement: Display the latest weather fetch diagnostic in MQTT Settings

The Data Hub External Data Weather area SHALL display a persistent, operator-readable diagnostic panel for the latest server-side weather operation and SHALL allow an error code to be copied without exposing sensitive configuration.

#### Scenario: Latest weather request failed

- **WHEN** the trusted diagnostics endpoint reports state `error`
- **THEN** the weather settings panel SHALL display the diagnostic code, operation, occurrence time, safe summary, retryable state, optional HTTP status, and last success time when present
- **AND** it SHALL visually distinguish the error from an `ok` state

#### Scenario: Operator copies the error code

- **WHEN** an operator activates the copy action for an error diagnostic
- **THEN** the copied value SHALL include the diagnostic code and bounded safe context
- **AND** it SHALL NOT include CWA authorization, full URL, broker credentials, internal address, hostname, stack trace, or raw exception text

#### Scenario: Weather request succeeds

- **WHEN** the trusted diagnostics endpoint reports state `ok`
- **THEN** the panel SHALL display the latest successful operation and `lastSuccessAt`
- **AND** it SHALL NOT display a stale error code as current

#### Scenario: Weather has not run or is unconfigured

- **WHEN** the diagnostic state is `never-attempted` or `unconfigured`
- **THEN** the panel SHALL display an explicit neutral or configuration-required message
- **AND** the panel SHALL remain present instead of showing an empty area

### Requirement: Refresh the diagnostic panel after weather operations

The Data Hub External Data Weather area SHALL reload the trusted weather diagnostic after page load and after manual weather refresh or weather-options requests complete.

#### Scenario: Manual refresh returns an upstream failure

- **WHEN** an operator triggers manual weather refresh and the CWA request fails
- **THEN** the page SHALL reload the diagnostic endpoint after the refresh request settles
- **AND** the panel SHALL display the latest server diagnostic without requiring a full page reload

#### Scenario: Loading county or station options fails

- **WHEN** a county or station options request fails
- **THEN** the page SHALL reload the diagnostic endpoint after the request settles
- **AND** the panel SHALL identify the latest operation as `options`
