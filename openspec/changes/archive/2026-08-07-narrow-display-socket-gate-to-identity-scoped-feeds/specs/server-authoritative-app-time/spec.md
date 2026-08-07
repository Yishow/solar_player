## MODIFIED Requirements

### Requirement: Broadcast an ordered Server Time Signal

Each Server process SHALL create a new instanceId and sequence starting at 1. It SHALL emit server:time immediately after a Client connects and every 30000 milliseconds thereafter with instanceId, sequence, epochMs, timeZone=Asia/Taipei, and broadcastIntervalMs=30000.

The Server Time Signal SHALL be delivered to every connected Client regardless of whether that Client presents a valid Device Credential. The signal carries no Device identity and no Site Scope, so Device pairing SHALL NOT be a precondition for receiving it.

#### Scenario: Client connects to a running Server

- **WHEN** a display Client establishes its Socket connection
- **THEN** it receives one Server Time Signal without waiting for the periodic interval
- **AND** later signals from that process have strictly increasing sequence values

#### Scenario: Unpaired Client receives the Server Time Signal

- **WHEN** a Client without a valid Device Credential establishes its Socket connection
- **THEN** it receives one Server Time Signal immediately and every 30000 milliseconds thereafter
- **AND** its App Time SHALL leave the waiting state once the first signal is applied

##### Example: Unpaired browser leaves the waiting state

- **GIVEN** a browser with no Device Credential opens a playback display route
- **WHEN** its Socket connection is established
- **THEN** the header stops showing the waiting-for-sync state
- **AND** the header shows a clock derived from the Server Time Signal
