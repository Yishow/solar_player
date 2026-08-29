## ADDED Requirements

### Requirement: Playback live metrics state is site-scoped before selector isolation

The shared playback live metrics state SHALL be initialized and updated from a snapshot that has already been filtered to the authenticated playback context's effective site plus permitted global metrics. Selector-level render isolation MUST NOT be used as a security or site-isolation boundary.

#### Scenario: CL and KN share the same semantic metric key
- **WHEN** both sites have a `realTimePower` reading and a CL playback client connects
- **THEN** the CL client's shared live metrics state contains the CL `realTimePower` reading
- **AND** it does not retain or expose the KN `realTimePower` reading under the same semantic key

#### Scenario: Reconnect performs a fresh scoped bootstrap
- **WHEN** a playback socket reconnects after device context or metric updates
- **THEN** the client refreshes from the server-authoritative scoped snapshot before applying subsequent live updates
- **AND** stale readings from another site SHALL NOT survive the reconnect merge
