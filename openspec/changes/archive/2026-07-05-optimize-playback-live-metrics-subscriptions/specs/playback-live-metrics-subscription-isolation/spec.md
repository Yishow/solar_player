## ADDED Requirements

### Requirement: Playback live metrics consumers subscribe through selector-scoped shared state

The system SHALL expose shared playback live metrics state that lets web runtime consumers subscribe to selected live metric readings or socket connection state without depending on whole-snapshot object identity. A consumer bound to one selected metric SHALL update when that selected value changes, and SHALL NOT rebuild solely because an unrelated metric in the shared snapshot changed.

#### Scenario: Selected metric update refreshes the subscribing consumer

- **WHEN** a playback consumer subscribes to `todayGeneration` and the next `liveMetrics:update` changes only `todayGeneration`
- **THEN** the subscribing consumer updates to the new `todayGeneration` value
- **AND** the update uses the same shared live metrics state written from the socket event

##### Example: one selected metric changes

| Selected metric | Previous value | Next value | Unrelated metric change | Expected consumer update |
| --------------- | -------------- | ---------- | ----------------------- | ------------------------ |
| `todayGeneration` | `812.4` | `813.0` | none | update |
| `todayGeneration` | `812.4` | `812.4` | `phaseRPower` changed | no update |

#### Scenario: Connection-state selector updates independently from metrics

- **WHEN** the shared live metrics state receives a socket connection-state change while the selected metric readings stay the same
- **THEN** a consumer subscribed only to connection state updates to the new connection status
- **AND** a consumer subscribed only to unchanged metric readings remains stable

### Requirement: Legacy full-snapshot consumers remain supported during selector rollout

The system SHALL preserve the existing full-snapshot playback consumer contract while selector-scoped subscriptions are introduced. Callers that still use `useLiveMetrics()` SHALL continue to receive the latest snapshot, connection state, derived `isSocketConnected`, and `lastUpdatedAt` values from the same shared runtime source.

#### Scenario: Existing full-snapshot hook reads the latest shared state

- **WHEN** the shared live metrics state receives a newer `liveMetrics:update` snapshot and a caller uses `useLiveMetrics()`
- **THEN** the caller receives the latest snapshot and derived connection fields without needing to opt into selector-scoped hooks
- **AND** no additional socket client is created for that caller

#### Scenario: Existing full-snapshot hook reflects connection degradation

- **WHEN** the socket connection moves from `connected` to `disconnected` while the last snapshot remains cached
- **THEN** `useLiveMetrics()` continues to expose the last known snapshot
- **AND** it reports the degraded connection state through the existing connection-related fields
