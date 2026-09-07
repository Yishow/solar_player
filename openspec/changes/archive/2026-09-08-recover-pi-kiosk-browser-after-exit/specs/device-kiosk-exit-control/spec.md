## ADDED Requirements

### Requirement: Preserve intentional kiosk exit while browser recovery is active

The fixed kiosk stop helper SHALL distinguish an intentional operator exit from an unexpected Firefox exit so browser recovery does not reopen the kiosk until a new launcher invocation.

#### Scenario: Trusted operator exits a monitored kiosk

- **WHEN** the fixed kiosk stop helper is invoked
- **THEN** it creates the kiosk stop marker before stopping Firefox
- **AND** the active launcher observes the marker after its Firefox child exits
- **AND** the launcher exits normally without restarting Firefox

#### Scenario: Operator re-enters the kiosk from the desktop

- **WHEN** the operator starts `Solar Display Kiosk` after an intentional exit
- **THEN** the new launcher invocation removes the stale kiosk stop marker
- **AND** the launcher passes the server health gate
- **AND** the launcher starts Firefox and resumes browser recovery monitoring

#### Scenario: A new graphical session autostarts after an earlier intentional exit

- **WHEN** a new graphical session invokes the kiosk launcher while an old kiosk stop marker exists
- **THEN** the new launcher removes the stale marker
- **AND** the earlier intentional exit does not suppress kiosk startup in the new session
