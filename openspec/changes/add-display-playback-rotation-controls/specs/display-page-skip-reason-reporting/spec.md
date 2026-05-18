## ADDED Requirements

### Requirement: Record skip reason reporting for skipped display pages

The system SHALL record skip reason reporting for display pages that are excluded from playback because of runtime conditions.

#### Scenario: Management surface reads skipped pages

- **WHEN** a rotation preview or diagnostics surface loads the current playback state
- **THEN** skipped pages include a machine-readable skip reason
- **AND** the response distinguishes reasons such as disabled, out-of-schedule, or not-ready

##### Example: Rotation diagnostics report out-of-schedule page

- **GIVEN** `images` is enabled but outside the active playback schedule window
- **WHEN** a diagnostics surface loads the current playback state
- **THEN** `images` appears in the skipped list with an out-of-schedule reason
- **AND** that reason differs from disabled or readiness-failure cases

### Requirement: Preserve a safe fallback when no display pages are playable

The system SHALL preserve a safe fallback behavior when conditional playback leaves no display pages available for playback.

#### Scenario: No display page can be played

- **WHEN** all configured pages are skipped by conditional playback
- **THEN** the system falls back to the existing safe playback or offline behavior
- **AND** the no-playable-pages condition remains diagnosable

##### Example: All pages fail readiness during a degraded backend event

- **GIVEN** every configured display page is blocked by missing readiness or health checks
- **WHEN** the runtime evaluates the current playback cycle
- **THEN** it falls back to the configured safe playback or offline route
- **AND** diagnostics still report that no playable pages were available
