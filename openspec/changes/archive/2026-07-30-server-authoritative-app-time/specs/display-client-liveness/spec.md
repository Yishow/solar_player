## ADDED Requirements

### Requirement: Report Time Sync State in Device heartbeats

Each Device heartbeat SHALL include exactly one Time Sync State: waiting, synced, stale, or time-untrusted. The Server SHALL expose that state in the Device liveness snapshot.

#### Scenario: Client crosses the stale threshold

- **WHEN** the Client has not received a Time Signal for 90000 milliseconds
- **THEN** its next heartbeat reports stale
- **AND** Device Status can distinguish stale from disconnected
