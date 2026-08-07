## ADDED Requirements

### Requirement: Sync coalescing survives client re-renders

The system SHALL preserve display sync coalescing state across client re-renders. A pending debounce window or an in-flight reload SHALL NOT be discarded merely because the consuming component re-rendered.

The playback runtime reload entry point SHALL keep a stable identity across renders, so that consumers using it as an effect dependency do not tear down and rebuild the coordinator on every render.

#### Scenario: A sync event arrives and the component re-renders before the debounce elapses

- **WHEN** a relevant display sync event has been received
- **AND** the consuming component re-renders before the debounce window elapses
- **THEN** the pending reload SHALL still occur
- **AND** it SHALL NOT be silently dropped

#### Scenario: A burst of sync events spans several re-renders

- **WHEN** multiple relevant display sync events arrive while the component re-renders repeatedly
- **THEN** the client SHALL complete at most one additional reload cycle for that burst
- **AND** it SHALL NOT spawn overlapping runtime refreshes

#### Scenario: Reload identity is stable between renders

- **WHEN** the playback controller renders repeatedly without a change to its inputs
- **THEN** the reload entry point it exposes SHALL retain the same identity across those renders

### Requirement: Runtime refresh reconciles against the current route

The system SHALL reconcile playback runtime after a scheduled refresh using the route active at the moment the refresh runs, not the route captured when the refresh loop was established.

#### Scenario: The route changes between refresh cycles

- **WHEN** playback rotation changes the active route after the periodic refresh loop was established
- **AND** a scheduled runtime refresh then runs
- **THEN** route reconciliation SHALL use the route active at refresh time
- **AND** it SHALL NOT reset playback to the route captured when the loop was established
