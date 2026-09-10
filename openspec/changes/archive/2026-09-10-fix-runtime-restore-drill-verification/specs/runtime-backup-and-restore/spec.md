## MODIFIED Requirements

### Requirement: Restore drill proves database and runtime viability

A restore drill invoked with `--drill` SHALL extract into a fresh temporary root, open the restored SQLite database, run `PRAGMA integrity_check`, apply pending migrations in the temporary root, and run a bounded health smoke against the restored state. Integrity, migrations, and health SHALL be required phases, each with an explicit `name`, `required`, and `status`. A full drill SHALL exit zero and report JSON `status` exactly `ok` only when every required phase has `status` exactly `ok`; a skipped or unavailable required phase SHALL fail closed.

If `RESTORE_DRILL_MIGRATE_CMD` is configured, the migrations phase SHALL treat exit code 0 as success, including an empty stdout body; migration stdout SHALL NOT be parsed as a health response. This change SHALL NOT introduce a migration timeout or describe the health deadline as a whole-drill bound. Without that override, the drill SHALL require a readable `apps/server/dist/db/migrate.js`, an available Node runtime, and a callable migrateDatabase export that completes successfully. An OS executable bit on the module SHALL NOT be required. A missing entrypoint or runtime SHALL be unavailable; a loading or migration error SHALL be failed.

If `RESTORE_DRILL_HEALTH_CMD` is configured, the drill SHALL use that command as the bounded health entrypoint and SHALL NOT require `apps/server/dist/server.js`. The override SHALL exit 0 before the shared health deadline and SHALL produce a valid bounded health body. An invalid, empty, overlong, timed-out, or nonzero override SHALL fail the health phase and SHALL NOT fall back to `server.js`. If no health override is configured, the drill SHALL require `apps/server/dist/server.js` and SHALL run the bounded curl health smoke.

The health phase SHALL use the existing `HEALTH_TIMEOUT_SECONDS="${RESTORE_HEALTH_TIMEOUT_SECONDS:-20}"` value, whose default is 20 seconds, to establish one absolute deadline at health-phase start. The default server curl invocation and an explicit health override SHALL both use the remaining time from that same deadline; neither path SHALL reset or extend it. The health response body SHALL be no larger than 65536 bytes.

The health parser SHALL preserve response bytes and SHALL accept a JSON object only when its top-level `status` is the exact string `ok`, or plain bytes exactly equal to `ok`, `ok` followed by one LF, or `ok` followed by one CRLF. Other JSON fields SHALL NOT invalidate an accepted top-level status. Empty bodies, malformed JSON, non-object JSON, or an absent or non-ok top-level status SHALL fail; a substring in another field SHALL NOT prove health. Plain bodies with extra whitespace, text, or multiple terminal line endings SHALL fail. The implementation SHALL NOT use shell command substitution or generic trimming to obtain the body.

Default server startup probes MAY retry transient connection failures or non-success HTTP status within the same total deadline. Every request and polling delay SHALL be bounded by its remaining time. A successful HTTP response with an invalid or oversized body, early server exit, or deadline exhaustion SHALL fail. An explicit override SHALL execute once without fallback. Cleanup SHALL terminate and reap the owned server or override process group, including ordinary child processes, with at most 2 seconds of cleanup grace after TERM before KILL/reap; this SHALL NOT extend the health success deadline. Unconfirmed cleanup SHALL report unknown and SHALL NOT permit full success. No guarantee SHALL be made for independently daemonized processes, SIGKILL, or power loss.

The full-drill success summary SHALL contain `status:"ok"`, `mode:"full-drill"`, `fullDrill:true`, and explicit successful results for integrity, migrations, and health. A failed drill SHALL emit a non-success summary with `fullDrill:false`, explicit phase results, and an explicit cleanup result; an inventory or health-skip path SHALL emit `status:"incomplete"`, `fullDrill:false`, and an explicit skipped phase, then exit nonzero. Non-success output SHALL NOT claim full verification. On a controllable cleanup path, cleanup SHALL complete before the summary is emitted; if cleanup cannot be confirmed, the summary SHALL report cleanup as `unknown` and identify only the owned temporary path.

#### Scenario: Restored database is valid

- **WHEN** the restore drill runs against a verified archive
- **THEN** SQLite `integrity_check` returns ok in the temporary root
- **AND** pending migrations complete in the temporary copy
- **AND** the health smoke returns the accepted healthy response
- **AND** the final JSON summary has `status` exactly `ok` and explicit required phase results for integrity, migrations, and health
- **AND** the production root, production service, and production database remain untouched

#### Scenario: An empty migration override output is successful

- **WHEN** a configured `RESTORE_DRILL_MIGRATE_CMD` exits 0 and writes no stdout
- **THEN** the migrations phase has `status` exactly `ok`
- **AND** the drill does not require non-empty migration stdout or parse it as a health body
- **AND** the health phase still has to satisfy its own valid-body contract

#### Scenario: A valid health override replaces the default server entrypoint

- **WHEN** a configured `RESTORE_DRILL_HEALTH_CMD` exits 0 before the shared deadline and emits an accepted JSON or plain health body while `apps/server/dist/server.js` is absent
- **THEN** the health phase has `status` exactly `ok`
- **AND** the drill does not require or start the absent default server entrypoint
- **AND** the full drill can complete only if integrity and migrations also have `status` exactly `ok`

#### Scenario: Exact plain ok responses are accepted

- **WHEN** the bounded health endpoint returns exactly `ok`, exactly `ok` followed by one LF, or exactly `ok` followed by one CRLF
- **THEN** the health phase has `status` exactly `ok`
- **AND** a second line ending, other whitespace, or additional text is not accepted

#### Scenario: Other JSON fields do not negate a healthy status

- **WHEN** a health response is {"status":"ok","note":"token error counter is zero"}
- **THEN** its top-level status is accepted regardless of the note text

#### Scenario: Default server startup retries share one deadline

- **WHEN** the first localhost probe is refused during startup and a later probe returns an accepted body before the same deadline
- **THEN** health succeeds without resetting the deadline
- **AND** a server or override fixture that exceeds the deadline is stopped with its ordinary child process before confirmed cleanup is reported

#### Scenario: Not-ok, error-token, and malformed responses fail closed

- **WHEN** the bounded health endpoint returns `not-ok`, an error JSON containing an `ok` or token substring outside an exact top-level status, malformed JSON, malformed plain content, or an empty body
- **THEN** the health phase has a non-ok result
- **AND** the drill exits nonzero
- **AND** the output does not report full-drill verification

#### Scenario: Oversize or timed-out health output fails closed

- **WHEN** curl or a configured health override exceeds the shared 20-second default or configured health deadline, or its response body exceeds 65536 bytes
- **THEN** the health phase has a failed or unavailable result
- **AND** the drill exits nonzero without a full success summary
- **AND** the command does not reset the deadline for a second curl or override attempt

#### Scenario: Missing migration entrypoint is unavailable

- **WHEN** a full drill restores a temporary application without `apps/server/dist/db/migrate.js` and without an explicit migration override
- **THEN** the migrations phase is `unavailable`
- **AND** the drill exits nonzero before reporting full success
- **AND** the output identifies migrations as unavailable only as an incomplete or failed phase, not as completed inventory

#### Scenario: Missing server is allowed only with a valid health override

- **WHEN** a full drill lacks `apps/server/dist/server.js` and has no configured health override, or has a configured health override that is invalid, timed out, empty, overlong, or nonzero
- **THEN** the health phase is unavailable or failed
- **AND** the drill exits nonzero
- **AND** an invalid override is not replaced by a fallback server probe

#### Scenario: An explicit health skip cannot masquerade as verification

- **WHEN** `RESTORE_SKIP_HEALTH=1` is supplied to the drill path
- **THEN** the result identifies the health phase as `skipped`, the overall result as `incomplete`, and `fullDrill` as `false`
- **AND** the command exits nonzero for the full-drill invocation
- **AND** the output states that the result is not full verification

#### Scenario: Missing restored database fails the required integrity phase

- **WHEN** a full drill has no restored `data/solar-display.sqlite` database
- **THEN** the integrity phase is unavailable or failed
- **AND** the drill exits nonzero without a full success result

#### Scenario: Ordinary restore is unchanged by drill-only gates

- **WHEN** the restore helper is invoked without `--drill`
- **THEN** it retains the existing archive checksum validation, explicit overwrite confirmation, rollback material, and production isolation behavior
- **AND** it does not run the drill-only required-phase summary or health/migration availability gates
