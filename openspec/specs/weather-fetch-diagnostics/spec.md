# weather-fetch-diagnostics Specification

## Purpose

Provide stable, bounded weather-fetch diagnostics for trusted management operators without exposing sensitive request details through public weather contracts.

## Requirements

### Requirement: Classify CWA request failures with stable diagnostic codes

The server SHALL classify failures from current-weather and weather-options requests into stable, bounded weather diagnostic codes without exposing credentials, full request URLs, internal addresses, stack traces, or raw exception text.

#### Scenario: DNS lookup fails

- **WHEN** a CWA request fails because the dataset hostname cannot be resolved
- **THEN** the server SHALL record `WEATHER_DNS_LOOKUP_FAILED`
- **AND** the diagnostic SHALL identify the operation as `current` or `options`
- **AND** the diagnostic SHALL be marked retryable

#### Scenario: HTTP request is rejected

- **WHEN** CWA responds with a non-success HTTP status
- **THEN** the server SHALL record `WEATHER_HTTP_ERROR`
- **AND** it SHALL include the numeric HTTP status
- **AND** it SHALL NOT include the Authorization value or full request URL

#### Scenario: Failure does not match a known category

- **WHEN** a CWA request fails with an unrecognized error shape
- **THEN** the server SHALL record `WEATHER_UNKNOWN_ERROR`
- **AND** the public diagnostic summary SHALL remain bounded and free of raw exception text

##### Example: diagnostic classification table

| Failure | Code | Retryable |
| --- | --- | --- |
| Missing CWA authorization | `WEATHER_UNCONFIGURED` | false |
| DNS lookup failure | `WEATHER_DNS_LOOKUP_FAILED` | true |
| Connection timeout | `WEATHER_CONNECTION_TIMEOUT` | true |
| Request abort timeout | `WEATHER_REQUEST_TIMEOUT` | true |
| TLS handshake or certificate failure | `WEATHER_TLS_FAILED` | true |
| Non-success HTTP response | `WEATHER_HTTP_ERROR` | status-dependent |
| Invalid CWA payload | `WEATHER_INVALID_PAYLOAD` | true |
| Unknown failure | `WEATHER_UNKNOWN_ERROR` | true |

### Requirement: Retain the latest bounded weather operation diagnostic

The weather service SHALL retain the latest current-weather or weather-options operation result in memory, including its state, operation, occurrence time, last successful operation time, safe code, safe summary, optional HTTP status, and retryable flag.

#### Scenario: A request succeeds

- **WHEN** a current-weather or weather-options request succeeds
- **THEN** the diagnostic state SHALL become `ok`
- **AND** `lastSuccessAt` SHALL equal the successful completion time
- **AND** error code and HTTP status SHALL be null

#### Scenario: A request fails after a previous success

- **WHEN** a weather operation fails after at least one successful weather operation
- **THEN** the diagnostic state SHALL become `error`
- **AND** `occurredAt` SHALL identify the failure time
- **AND** the previous `lastSuccessAt` SHALL be preserved

#### Scenario: Service has not attempted a weather request

- **WHEN** the server starts and no weather operation has run
- **THEN** the diagnostic state SHALL be `never-attempted`
- **AND** operation, code, occurrence time, and last success time SHALL be null

### Requirement: Expose diagnostics only through a trusted management endpoint

The server SHALL expose the latest bounded weather diagnostic through `GET /api/weather/diagnostics` only to trusted management readers, while keeping public playback weather contracts free of diagnostic details.

#### Scenario: Trusted operator reads the latest error

- **WHEN** a trusted management reader requests `GET /api/weather/diagnostics`
- **THEN** the server SHALL return HTTP 200 with `{ diagnostic }`
- **AND** the diagnostic SHALL match the latest weather operation result

#### Scenario: Untrusted client requests diagnostics

- **WHEN** an untrusted client requests `GET /api/weather/diagnostics`
- **THEN** the server SHALL apply the existing management-read denial response
- **AND** the response SHALL NOT contain the latest diagnostic

#### Scenario: Playback client reads current weather

- **WHEN** any client requests the public current-weather contract
- **THEN** the response SHALL NOT include diagnostic code, raw error, request URL, token, credentials, stack trace, or internal hostname fields
