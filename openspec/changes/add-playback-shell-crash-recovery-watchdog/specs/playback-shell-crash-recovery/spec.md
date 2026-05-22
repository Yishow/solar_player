## ADDED Requirements

### Requirement: Playback render errors are contained and recovered

The playback shell SHALL wrap its routed content in an error boundary that catches errors thrown during rendering. When an error is caught, the boundary SHALL render a minimal fallback view instead of an unhandled white screen, log the error, and request an automatic reload subject to the reload budget.

#### Scenario: Render error shows fallback and requests reload

- **WHEN** a playback route component throws during rendering
- **THEN** the error boundary SHALL render the fallback view instead of propagating the error to an unhandled white screen
- **AND** it SHALL request an automatic reload when the reload budget allows it

#### Scenario: Reload budget exhausted keeps fallback without reloading

- **WHEN** a render error occurs and the reload budget for the current window is already exhausted
- **THEN** the error boundary SHALL keep showing the fallback view
- **AND** it SHALL NOT trigger another automatic reload

### Requirement: Dynamic import (chunk load) failures trigger recovery

The application entry SHALL listen for dynamic-module load failures via the `vite:preloadError` event and via `unhandledrejection` events whose reason is a recognized chunk load failure. When such a failure is detected, the system SHALL reload the application subject to the reload budget.

#### Scenario: Chunk load failure reloads the app

- **WHEN** a `vite:preloadError` event fires or an `unhandledrejection` whose reason matches a recognized dynamic-import failure occurs
- **THEN** the system SHALL reload the application when the reload budget allows it

#### Scenario: Non-chunk rejection is ignored by recovery

- **WHEN** an `unhandledrejection` occurs whose reason is not a recognized dynamic-import failure
- **THEN** the chunk-load recovery SHALL NOT reload the application

##### Example: chunk-load error classification

| Rejection reason text                                      | Recognized as chunk load failure |
| ---------------------------------------------------------- | -------------------------------- |
| "Failed to fetch dynamically imported module: /assets/x.js" | true                             |
| "error loading dynamically imported module"                | true                             |
| "Importing a module script failed"                         | true                             |
| "TypeError: cannot read properties of undefined"           | false                            |

### Requirement: Playback rotation stall is detected and recovered

The playback shell SHALL run a watchdog that detects when rotation has stalled. A stall SHALL be reported only when playback is active, more than one playable page exists, and the current page has not advanced within its expected duration plus a fixed grace period. When a stall is reported, the system SHALL reload the application subject to the reload budget.

#### Scenario: Stalled rotation while playing triggers reload

- **WHEN** playback is active with more than one playable page and the current page has not advanced within its expected duration plus the grace period
- **THEN** the watchdog SHALL report a stall and request a reload when the reload budget allows it

#### Scenario: Single playable page does not count as a stall

- **WHEN** there is only one playable page and it does not advance
- **THEN** the watchdog SHALL NOT report a stall

#### Scenario: Paused playback does not count as a stall

- **WHEN** playback is not active
- **THEN** the watchdog SHALL NOT report a stall

##### Example: stall decision

| isPlaying | playablePageCount | msSinceLastPageChange | expectedDurationMs | graceMs | Stall? |
| --------- | ----------------- | --------------------- | ------------------ | ------- | ------ |
| true      | 3                 | 40000                 | 15000              | 15000   | true   |
| true      | 3                 | 20000                 | 15000              | 15000   | false  |
| true      | 1                 | 99000                 | 15000              | 15000   | false  |
| false     | 3                 | 99000                 | 15000              | 15000   | false  |

### Requirement: Reload budget prevents infinite reload loops

The system SHALL enforce a reload budget that limits automatic reloads to a fixed maximum within a sliding time window. Reload attempts SHALL be recorded in a persistent per-session store so the budget survives the reloads it triggers. When the maximum is reached within the window, further automatic reloads SHALL be suppressed until older attempts fall outside the window.

#### Scenario: Reload allowed below the limit

- **WHEN** the number of recorded reloads within the window is below the maximum
- **THEN** the budget evaluation SHALL allow the reload and record the new attempt

#### Scenario: Reload suppressed at the limit

- **WHEN** the number of recorded reloads within the window has reached the maximum
- **THEN** the budget evaluation SHALL deny further automatic reloads until older attempts age out of the window

##### Example: budget evaluation (maxReloads=3, windowMs=600000)

| Recorded attempts within window | New attempt allowed |
| ------------------------------- | ------------------- |
| 0                               | true                |
| 2                               | true                |
| 3                               | false               |
