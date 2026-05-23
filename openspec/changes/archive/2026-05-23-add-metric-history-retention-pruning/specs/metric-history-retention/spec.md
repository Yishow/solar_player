## ADDED Requirements

### Requirement: Metric snapshots are pruned beyond a retention window

The system SHALL periodically delete rows from `metric_snapshots` whose `captured_at` is older than a configurable snapshot retention window. The retention window SHALL default to 90 days and SHALL be configurable via the `METRIC_SNAPSHOT_RETENTION_DAYS` environment variable.

#### Scenario: Snapshots older than the window are deleted

- **WHEN** a retention sweep runs with a configured snapshot retention window
- **THEN** rows in `metric_snapshots` whose `captured_at` is older than the cutoff SHALL be deleted
- **AND** rows whose `captured_at` is within the window SHALL be retained

##### Example: snapshot cutoff computation

- **GIVEN** the current time is `2026-05-22T00:00:00.000Z` and snapshot retention is 90 days
- **WHEN** the cutoff is computed
- **THEN** the snapshot cutoff SHALL be `2026-02-21T00:00:00.000Z`
- **AND** a row captured at `2026-02-20T23:59:59.000Z` SHALL be deleted while a row captured at `2026-02-21T00:00:01.000Z` SHALL be retained

### Requirement: Daily energy summaries are pruned beyond a retention window

The system SHALL periodically delete rows from `daily_energy_summaries` whose `date` is older than a configurable summary retention window. The retention window SHALL default to 1825 days and SHALL be configurable via the `DAILY_SUMMARY_RETENTION_DAYS` environment variable.

#### Scenario: Summaries older than the window are deleted

- **WHEN** a retention sweep runs with a configured summary retention window
- **THEN** rows in `daily_energy_summaries` whose `date` is older than the cutoff date SHALL be deleted
- **AND** rows whose `date` is on or after the cutoff date SHALL be retained

### Requirement: Cumulative counters are never pruned

The retention sweep SHALL NOT delete any rows from `cumulative_counters`, because those rows hold the running totals that drive current displayed metrics.

#### Scenario: Counters survive a retention sweep

- **WHEN** a retention sweep runs
- **THEN** all rows in `cumulative_counters` SHALL remain unchanged

### Requirement: VACUUM runs only after a prune and at a limited frequency

After a retention sweep that actually deleted rows, the system SHALL run `VACUUM` to reclaim disk space, but only when VACUUM is enabled and at least one VACUUM interval has elapsed since the previous VACUUM. When no rows were deleted, or VACUUM is disabled, or the interval has not elapsed, the sweep SHALL NOT run `VACUUM`.

#### Scenario: VACUUM decision after a sweep

- **WHEN** a retention sweep completes
- **THEN** the system SHALL run `VACUUM` only if VACUUM is enabled, rows were deleted, and the time since the last VACUUM is at least the configured interval

##### Example: VACUUM decision

| vacuumEnabled | deletedRows | ms since last VACUUM | vacuumIntervalMs | Run VACUUM? |
| ------------- | ----------- | -------------------- | ---------------- | ----------- |
| true          | 120         | 700000000            | 604800000        | true        |
| true          | 120         | 1000                 | 604800000        | false       |
| true          | 0           | 700000000            | 604800000        | false       |
| false         | 120         | 700000000            | 604800000        | false       |

### Requirement: Retention sweep runs on a background schedule tied to server lifecycle

The retention sweep SHALL run on a fixed background interval while the server is running, and SHALL stop when the server closes. A sweep failure SHALL be logged and SHALL NOT crash the server or stop subsequent sweeps.

#### Scenario: Sweep stops on server close

- **WHEN** the server closes
- **THEN** the retention service SHALL stop its scheduled sweeps

#### Scenario: Sweep failure is isolated

- **WHEN** a retention sweep throws an error
- **THEN** the error SHALL be logged
- **AND** the server SHALL continue running and future sweeps SHALL still be scheduled
