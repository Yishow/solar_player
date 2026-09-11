## ADDED Requirements

### Requirement: Serial-backed Solar zones keep a durable numeric identity across collector restarts

The Go Solar collector SHALL maintain a versioned collector-owned identity state beside the authoritative config so a non-empty trimmed zone serial keeps the same numeric `zone_id` for a factory across process restarts, API reordering, temporary absence, and later reappearance. The durable state SHALL be independent of `sqlite_enabled`. Existing numeric MQTT topic shapes SHALL remain unchanged.

#### Scenario: Restart and reorder preserve serial identity

- **GIVEN** factory KN first observes serials A, B, C and durably assigns numeric zone ids
- **WHEN** a new collector process starts with the same sidecar and the API returns C, A, B
- **THEN** each serial receives exactly its previously persisted numeric zone id
- **AND** canonical topics remain `solar/KN/zone/{numericId}`

#### Scenario: Removed zone returns and new id is not reused

- **GIVEN** serial B already owns a numeric id
- **WHEN** B is absent for later rounds and a new serial D appears
- **THEN** B's mapping remains reserved
- **AND** D receives a previously unused id
- **AND** if B later reappears it receives its original id

#### Scenario: Duplicate serial in one fetch is rejected

- **WHEN** one fetched zone batch contains the same trimmed serial more than once
- **THEN** identity resolution fails for that batch instead of assigning one numeric id to multiple rows
- **AND** the affected batch is not published or recorded as canonical zone data

### Requirement: New zone identity aliases become durable before canonical data use

When one or more identity keys require new numeric ids, the collector SHALL persist the complete updated sidecar state before returning those resolved ids to MQTT publication or local history recording. If persistence fails, the allocation SHALL be rolled back in memory and the affected round SHALL NOT use the unpersisted ids for canonical data.

#### Scenario: Sidecar write fails

- **WHEN** a new serial requires allocation and the sidecar cannot be written atomically
- **THEN** identity resolution returns an error instead of resolved zones
- **AND** the service does not publish or record the unpersisted numeric alias
- **AND** a later successful retry may allocate from the last durable state without inheriting the failed in-memory allocation

### Requirement: Existing sidecar is authoritative and missing sidecar may bootstrap from recent history

A factory already present in valid sidecar state SHALL use that state without allowing SQLite history to overwrite or gate it. When no sidecar state exists for a factory and SQLite history is available, the collector SHALL bootstrap from the newest single-timestamp snapshot whose non-empty serials and positive zone ids are one-to-one. The next allocation SHALL also be greater than every numeric zone id previously recorded for that factory. When storage is disabled or no usable history exists, first-fetch allocation SHALL still persist to sidecar and provide stability from then on.

#### Scenario: Existing sidecar wins over conflicting history

- **GIVEN** valid sidecar state already assigns serial A to zone 1
- **AND** legacy history now contains a conflicting or ambiguous latest snapshot
- **WHEN** the collector starts
- **THEN** the sidecar mapping remains authoritative
- **AND** that history conflict does not overwrite or block the existing sidecar factory

#### Scenario: First upgrade preserves latest coherent snapshot

- **GIVEN** no sidecar exists and the latest KN history snapshot maps A to 2 and B to 5
- **AND** the largest zone id ever recorded for KN is 8
- **WHEN** identity state is bootstrapped
- **THEN** A remains 2 and B remains 5
- **AND** a new serial receives id 9 or greater

#### Scenario: SQLite is disabled

- **GIVEN** no sidecar exists and `sqlite_enabled=false`
- **WHEN** the first successful fetch resolves serial-backed zones
- **THEN** their mapping is persisted to sidecar before canonical use
- **AND** a later process restart uses that sidecar regardless of API ordering

### Requirement: Corrupt identity state fails explicitly instead of silently renumbering

An existing identity sidecar with invalid JSON, unsupported version, invalid identity keys, non-positive ids, duplicate identity keys, or one numeric id bound to multiple identity keys SHALL be rejected. The collector SHALL NOT delete or reset the state and continue from 1.

#### Scenario: Existing sidecar contains collision

- **WHEN** a factory sidecar binds two identity keys to the same numeric zone id
- **THEN** startup or identity preparation fails with an observable identity-state error
- **AND** no automatic renumbering is performed

### Requirement: Serial-less zones remain outside the durable hardware identity guarantee

A zone whose trimmed serial is empty SHALL use only a positive position-based fallback and SHALL produce an observable warning indicating that cross-restart hardware identity is not guaranteed. The collector SHALL NOT infer a durable identity from mutable name, capacity, or measurement values.

#### Scenario: Zone has no serial

- **WHEN** a fetched zone has an empty serial
- **THEN** the collector may assign the best-effort position fallback a numeric id
- **AND** it emits a warning that the zone is outside the durable identity guarantee
- **AND** no name/capacity composite identity is created
