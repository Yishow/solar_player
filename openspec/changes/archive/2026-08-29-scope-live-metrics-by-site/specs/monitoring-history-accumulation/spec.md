## ADDED Requirements

### Requirement: Monitoring history accumulation is partitioned by metric scope

The monitoring history pipeline SHALL accumulate and restore site-dependent snapshots, daily summaries, and cumulative counters independently for `cl` and `kn`. Explicit cross-site aggregates SHALL be persisted under `global` and MUST NOT overwrite or replace either site's history.

#### Scenario: CL and KN counters advance independently
- **WHEN** CL generation advances while KN generation is unchanged
- **THEN** the CL cumulative and current-day history advance for `cl`
- **AND** the KN cumulative and current-day history remain unchanged

#### Scenario: Server restarts in MQTT mode
- **WHEN** the server starts with persisted CL, KN, and global monitoring history but no new broker message has arrived
- **THEN** the server restores each scope independently
- **AND** a CL playback request reads the persisted CL history without requiring a KN or global row to substitute for it

### Requirement: Local-day baselines are maintained per scope

Daily-summary baseline state SHALL be tracked independently for each metric scope so one site's first update or day rollover does not reset another site's accumulated daily delta.

#### Scenario: CL receives its first update after midnight before KN
- **WHEN** the local date changes and CL receives a new cumulative reading before KN
- **THEN** the CL day baseline rolls over for CL only
- **AND** the persisted KN baseline remains available until KN is processed for that date
