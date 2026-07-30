## ADDED Requirements

### Requirement: Broadcast an ordered Server Time Signal

Each Server process SHALL create a new instanceId and sequence starting at 1. It SHALL emit server:time immediately after a Client connects and every 30000 milliseconds thereafter with instanceId, sequence, epochMs, timeZone=Asia/Taipei, and broadcastIntervalMs=30000.

#### Scenario: Client connects to a running Server

- **WHEN** a display Client establishes its Socket connection
- **THEN** it receives one Server Time Signal without waiting for the periodic interval
- **AND** later signals from that process have strictly increasing sequence values

### Requirement: Derive App Time from monotonic elapsed time

A Client SHALL accept only a larger sequence for the same instanceId and SHALL accept a new baseline when instanceId changes. It SHALL compute App Time from the accepted epochMs plus performance monotonic elapsed time, not from the Client OS Clock.

#### Scenario: Duplicate and out-of-order signals arrive

- **WHEN** a Client has accepted sequence 8 and later receives sequence 8 or 7 for the same instanceId
- **THEN** it ignores those signals
- **AND** its App Time does not move backward

#### Scenario: Server restarts with a corrected Clock

- **WHEN** a Signal arrives with a new instanceId and sequence 1
- **THEN** the Client accepts the new epoch as its baseline even when it is earlier than the prior computed App Time

### Requirement: Expose deterministic Time Sync states

The Client SHALL report waiting before any valid Signal, synced until 90000 milliseconds after the last Signal, stale from 90000 milliseconds until 1800000 milliseconds, and time-untrusted at 1800000 milliseconds or later.

#### Scenario: Time state crosses exact boundaries

- **WHEN** state is computed from the last valid Signal
- **THEN** it matches the boundary table

##### Example: state boundaries

| Signal history | Elapsed | State |
| --- | ---: | --- |
| none | any | waiting |
| valid | 89999 ms | synced |
| valid | 90000 ms | stale |
| valid | 1799999 ms | stale |
| valid | 1800000 ms | time-untrusted |

### Requirement: Freeze absolute-time behavior when time is untrusted

In waiting and time-untrusted states, the Client SHALL freeze schedule transitions, freshness escalation, and data age calculation. Relative page duration, Autoplay, and Loop SHALL continue from monotonic elapsed time.

#### Scenario: Client starts offline without a Time Signal

- **WHEN** cached playback content is available but no valid Server Time Signal has been received
- **THEN** relative page rotation continues
- **AND** no absolute schedule transition or freshness age increment occurs

### Requirement: Apply recovered absolute-time results at a Safe Playback Boundary

After synchronization recovers, the Client SHALL update its internal App Time immediately and SHALL defer schedule or rotation results that alter the visible page until a Safe Playback Boundary.

#### Scenario: Recovery changes the active schedule

- **WHEN** a recovered Signal makes the current page out of schedule
- **THEN** the Client leaves the page at the next transition tick
- **AND** it does not reload in the middle of the current render frame
