## Purpose

Provide reproducible evidence for UI loading and rendering optimizations. Separate deterministic work reduction, measured timing, and visual or device acceptance so that performance claims remain auditable.

## ADDED Requirements

### Requirement: UI performance comparisons use reproducible isolated baselines

Each optimization report SHALL compare the verified result of fix-ui-draft-and-interaction-consistency with the candidate under the same fixture, browser, hardware, build mode, and cache condition. Reports SHALL record source and worktree identities, lockfile and fixture hashes, raw measurements, request and render counts, and limitations. Execution SHALL use the existing isolated browser smoke runtime without modifying production data.

#### Scenario: Paired runs preserve comparable inputs

- **WHEN** the UI performance suite measures editor/assets/shell navigation, canvas dragging, and asset selection
- **THEN** it SHALL retain five baseline and five candidate runs for each reported cold or warm condition
- **AND** it SHALL report all raw samples and their medians with environment and fixture identities

#### Scenario: Invalid comparisons do not produce a success claim

- **WHEN** a baseline is missing, fixture/environment identities differ, required samples are absent, or rendered/behavioral output differs
- **THEN** the comparison SHALL be marked incomplete or non-comparable with a reason
- **AND** the report SHALL NOT declare a verified performance improvement for that comparison

#### Scenario: Successful evidence remains available

- **WHEN** the suite runs with BROWSER_SMOKE_KEEP_SUCCESS_ARTIFACTS=1 and BROWSER_SMOKE_GREP=ui-performance
- **THEN** its JSON report and Playwright attachments SHALL remain under the browser smoke artifact directory after successful execution

### Requirement: UI performance claims require bounded work and preserved behavior

Acceptance SHALL prove the specified workspace wait removal, drag preparation/feedback bounds, and card rerender bounds in addition to preserving existing draft, access, geometry, CRUD, and rendered-output contracts. Timing outcomes SHALL be reported as measured, including unchanged or regressed results. Profiling SHALL remain opt-in and SHALL NOT change production-visible output when disabled.

#### Scenario: Each targeted optimization has an observable result

- **WHEN** the candidate is evaluated against its baseline
- **THEN** the report SHALL demonstrate that usable workspace content no longer waits for the specified unrelated or diagnostic requests, static drag preparation and feedback satisfy their session bounds, and selection-only card updates satisfy their rerender bounds
- **AND** it SHALL report navigation-to-frame, navigation-to-content, overlay, and selection timings without inventing improvement percentages

#### Scenario: Profiling is disabled for normal operation

- **WHEN** profiling flags are absent
- **THEN** the application SHALL NOT emit performance logs, change DOM output, or accumulate instrumentation entries from this change

#### Scenario: Local evidence is distinguished from visual and device acceptance

- **WHEN** local browser and deterministic checks pass
- **THEN** the delivery record SHALL separately identify the fresh FHD witness, intentional differences, user acceptance, and any untested Pi or production conditions
- **AND** local test success SHALL NOT imply deployment or physical-device acceptance
