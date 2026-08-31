## ADDED Requirements

### Requirement: Cross-site delivery never displaces the session's own-site snapshot

Live metric updates delivered to a session because of a cross-site binding SHALL be distinguishable from the session's own-site updates, and the client SHALL retain its own-site readings when a cross-site update arrives. A cross-site update MUST NOT clear, replace, or reassign the session's own-site scope state.

Composition order for the rendered snapshot SHALL be `global`, then cross-site scopes, then the session's own site, so that a metric key present in both the own-site and a cross-site payload resolves to the own-site reading.

The rendered snapshot timestamp and freshness policy SHALL derive from the `global` and own-site payloads only. Cross-site payloads contribute metric readings and MUST NOT change the session-level timestamp.

#### Scenario: KN session with one CL binding keeps its KN readings

- **WHEN** a KN playback session has one widget explicitly bound to a CL metric and the session receives its KN payload, its `global` payload, and the filtered CL payload
- **THEN** the rendered snapshot contains the KN readings, the `global` readings, and the authorized CL reading
- **AND** no KN metric falls back to its unavailable state
- **AND** subsequent CL broadcasts leave the KN readings intact

##### Example: composition of three payloads on a KN session

| Payload | Scope | Cross-site marker | Metrics carried | Contributes to rendered metrics | Contributes to timestamp |
| ------- | ----- | ----------------- | --------------- | ------------------------------- | ------------------------ |
| own-site | `kn` | absent | `totalPower`, `todayGeneration` | yes | yes |
| global | `global` | absent | `monthGeneration` | yes | yes |
| cross-site | `cl` | present | `realTimePower` | yes | no |

#### Scenario: Own-site reading wins a metric key collision

- **WHEN** a KN session receives a KN payload carrying `totalPower` and a cross-site CL payload also carrying `totalPower`
- **THEN** the rendered snapshot resolves `totalPower` to the KN reading
- **AND** the CL reading does not overwrite it regardless of arrival order

#### Scenario: Cross-site binding removal clears only the cross-site readings

- **WHEN** the published page no longer contains the CL binding and the session receives a cross-site CL payload carrying no metrics
- **THEN** the previously delivered CL readings are removed from the rendered snapshot
- **AND** the session's KN and `global` readings remain unchanged

### Requirement: Per-device cross-site subscription state is released when the device disconnects

The server SHALL hold per-device cross-site metric identity state only while that device has at least one live connection. When a device's last connection ends, the server SHALL discard that device's cross-site identity state and SHALL NOT emit further cross-site payloads addressed to that device.

#### Scenario: Disconnected device stops receiving cross-site payloads

- **WHEN** a KN device with an authorized CL identity disconnects and a CL broadcast follows
- **THEN** the server does not emit a cross-site payload addressed to that device
- **AND** the device's cross-site identity state is no longer retained

#### Scenario: Device with a second live connection keeps its cross-site state

- **WHEN** a device holds two connections and one of them disconnects
- **THEN** the device's cross-site identity state is retained for the remaining connection
- **AND** cross-site payloads continue to reach the device exactly once per broadcast
