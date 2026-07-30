## ADDED Requirements

### Requirement: Keep the kiosk browser recoverable within the graphical session

The installed kiosk launcher SHALL remain active after starting its Firefox child, SHALL recover the browser after an unexpected child exit, and SHALL keep retrying the existing server health gate when one health-check window expires.

#### Scenario: Firefox exits without an operator stop request

- **WHEN** the Firefox child exits and the kiosk stop marker is absent
- **THEN** the launcher records the child exit status
- **AND** the launcher waits for the configured recovery delay
- **AND** the launcher passes the server health gate again before starting Firefox with the same kiosk URL

#### Scenario: One server health window expires

- **WHEN** the server does not become healthy within `KIOSK_WAIT_SECONDS`
- **THEN** the launcher records the health timeout
- **AND** the launcher waits for the configured recovery delay
- **AND** the launcher begins another health-check window instead of permanently exiting

#### Scenario: A second launcher starts in the same active session

- **WHEN** the session PID file identifies a live kiosk launcher or Firefox lifecycle process
- **THEN** the second launcher records that the session is already managed
- **AND** the second launcher exits without starting another recovery loop
