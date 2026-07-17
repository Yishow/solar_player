## ADDED Requirements

### Requirement: Display the latest weather fetch diagnostic in MQTT Settings

The MQTT Settings weather section SHALL display a persistent, operator-readable diagnostic panel for the latest server-side weather operation and SHALL allow an error code to be copied without exposing sensitive configuration.

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

The MQTT Settings weather section SHALL reload the trusted weather diagnostic after page load and after manual weather refresh or weather-options requests complete.

#### Scenario: Manual refresh returns an upstream failure

- **WHEN** an operator triggers manual weather refresh and the CWA request fails
- **THEN** the page SHALL reload the diagnostic endpoint after the refresh request settles
- **AND** the panel SHALL display the latest server diagnostic without requiring a full page reload

#### Scenario: Loading county or station options fails

- **WHEN** a county or station options request fails
- **THEN** the page SHALL reload the diagnostic endpoint after the request settles
- **AND** the panel SHALL identify the latest operation as `options`
