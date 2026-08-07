## ADDED Requirements

### Requirement: Metric age is independent of the server time zone

The system SHALL compute live metric freshness age from the true instant the reading was stored, regardless of the time zone the server process runs in.

Stored live metric timestamps exist in two forms: an ISO 8601 form carrying an explicit zone designator, and a zone-less form written by the database as a UTC wall clock. The system SHALL interpret the zone-less form as UTC. The system SHALL NOT interpret it as server local time.

#### Scenario: A reading stored by the database clock is fresh

- **WHEN** a live metric is written using the database current-timestamp value
- **AND** its freshness is evaluated immediately afterwards
- **THEN** the reported age SHALL be near zero
- **AND** the reported freshness state SHALL be `live`

#### Scenario: The same reading is evaluated under a non-UTC server time zone

- **WHEN** the server process runs in a time zone offset from UTC
- **AND** a live metric written using the database current-timestamp value is evaluated immediately afterwards
- **THEN** the reported age SHALL be near zero
- **AND** the reported age SHALL equal the age reported under a UTC server time zone, within normal evaluation jitter

#### Scenario: An ISO timestamp carrying a zone designator is unaffected

- **WHEN** a live metric is written with an ISO 8601 timestamp carrying an explicit zone designator
- **THEN** its reported age and freshness state SHALL be unchanged by zone-less-form interpretation

##### Example: interpretation by stored form

| Stored timestamp form | Interpreted as | Reported age for a just-written reading |
| --------------------- | -------------- | --------------------------------------- |
| `2026-08-06 17:14:25` | UTC | near zero |
| `2026-08-06T17:14:25.000Z` | UTC | near zero |
| `2026-08-06T17:14:25+08:00` | UTC+08:00 | near zero |
| unrecognized text | not a time | state `unavailable` |

### Requirement: Timestamp normalization is idempotent and non-throwing

The system SHALL normalize a stored live metric timestamp to a form carrying an explicit zone designator before freshness evaluation. Normalization SHALL be idempotent, and SHALL NOT raise an error for unrecognized input.

#### Scenario: An already-zoned timestamp is not altered

- **WHEN** a timestamp already carrying an explicit zone designator is normalized
- **THEN** the result SHALL denote the same instant as the input
- **AND** normalizing the result again SHALL denote that same instant

#### Scenario: An unrecognized timestamp falls through to existing handling

- **WHEN** a stored timestamp cannot be recognized as either supported form
- **THEN** normalization SHALL return the input unchanged
- **AND** the existing unavailable-state handling SHALL apply
- **AND** normalization SHALL NOT raise an error

### Requirement: Stored metric timestamps are normalized at every read boundary

Normalization SHALL happen where a stored live metric timestamp leaves the storage layer, not only on the freshness-evaluation path. Every surface that exposes such a timestamp externally SHALL expose the normalized form, so that two surfaces describing the same reading cannot disagree about its instant.

Because the stored column holds a mix of forms once normalized, the system SHALL order and compare these timestamps by the instant they denote, and SHALL NOT compare them lexicographically.

#### Scenario: The MQTT topic view and the live metrics view agree

- **WHEN** a topic mapping's last-received timestamp and the corresponding live metric timestamp describe the same reading
- **THEN** both surfaces SHALL report the same timestamp form
- **AND** a comparison between them SHALL reflect the actual instants

#### Scenario: The snapshot's latest timestamp reflects the true latest instant

- **WHEN** a snapshot is read from rows whose stored timestamps use different zone designators
- **THEN** the snapshot's latest timestamp SHALL be the one denoting the latest instant
- **AND** it SHALL NOT be decided by lexicographic string order

#### Scenario: An unparseable row does not displace a parseable one

- **WHEN** a snapshot contains both an unparseable timestamp and at least one parseable timestamp
- **THEN** the snapshot's latest timestamp SHALL be a parseable one
- **AND** the read SHALL NOT raise an error
