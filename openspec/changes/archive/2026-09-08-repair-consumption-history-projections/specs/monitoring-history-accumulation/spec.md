## MODIFIED Requirements

### Requirement: Monitoring counters and daily summaries accumulate continuously
<!-- requirement-id: E3-M1 -->

The monitoring pipeline SHALL keep mock cumulative generation, consumption and self-consumption readings non-decreasing across updates and configured local-day boundaries. Mock readings SHALL only be produced when the stored data mode is mock. In MQTT mode, restart SHALL restore persisted counters, current-day summaries and current-day generation snapshots without requiring a new broker message and without substituting mock readings. For consumption, current-day and selected calendar-period results SHALL be projections of accepted meter observations through the canonical counter-difference resolver, not sums of register snapshots. Restored data SHALL retain its observation timestamps, coverage and quality. Missing start evidence or invalid continuity SHALL NOT become a valid zero. Other existing generation/self-consumption/CO2 calculation semantics SHALL remain unchanged.

#### Scenario: Mock counters across dates
<!-- scenario-id: E3-M1-S01 -->

- **GIVEN** the stored data mode is mock and readings are produced on one local day and the next
- **WHEN** the readings are compared in source-time order
- **THEN** each cumulative generation, consumption and self-consumption value is non-decreasing

#### Scenario: Current-day summary before rollover
<!-- scenario-id: E3-M1-S02 -->

- **GIVEN** valid day baselines are generation 12 kWh and consumption 4 kWh and current counters are 15 and 5
- **WHEN** the pipeline processes the current day
- **THEN** the current-day summary exposes generation 3 and consumption 1 kWh

#### Scenario: Restart extends same-day consumption
<!-- scenario-id: E3-M1-S03 -->

- **GIVEN** accepted meter evidence and a same-day persisted consumption projection exist
- **WHEN** the server restarts and receives a later valid reading
- **THEN** the same-day total is extended from its original baseline, not replaced by a new baseline at startup

#### Scenario: MQTT restoration before a new message
<!-- scenario-id: E3-M1-S04 -->

- **GIVEN** persisted counters, a current-day summary and generation snapshots exist in MQTT mode
- **WHEN** the broker has not yet sent a new message after restart
- **THEN** the saved values and monthly chart point remain readable with truthful age and quality, and no mock feed starts

#### Scenario: Incomplete history repair
<!-- scenario-id: E3-M1-S05 -->

- **GIVEN** only mid-month cumulative observations exist
- **WHEN** the month projection is rebuilt
- **THEN** the full month total stays null and any observed partial delta is separately labeled
