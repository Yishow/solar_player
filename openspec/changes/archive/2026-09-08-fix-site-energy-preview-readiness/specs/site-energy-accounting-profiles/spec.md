## ADDED Requirements

### Requirement: The management profile preview returns calculated review evidence

The normal management profile-preview API SHALL calculate review results from the server-validated immutable draft and selected source snapshot. Its response SHALL identify the review context, requested period, site calendar, source revisions, site total, department numerators, denominator members/value, shares and coverage/quality diagnostics. An absent calculation SHALL NOT be represented as missing measurements. Preview SHALL NOT activate a profile, alter accepted readings, publish MQTT or populate production history/projection caches; storing the preview token and review evidence is permitted.

#### Scenario: R9 complete readings reach the actual preview route
- **WHEN** the normal preview API receives a valid draft and its selected sources have valid same-period readings
- **THEN** it returns the calculated total, numerator, denominator and ratio for that draft rather than a null calculator placeholder
- **AND** the active profile, accepted readings and production projections remain unchanged

#### Scenario: R9 draft calendar differs from active calendar
- **WHEN** a reviewed draft uses a different site time zone from the active profile
- **THEN** preview uses the draft's calendar within its identified review context without claiming that the draft is already an active persisted revision

#### Scenario: R9 missing baseline is distinguishable from calculation failure
- **WHEN** the selected source lacks a required period baseline
- **THEN** preview returns nullable results with a missing-baseline diagnostic; a calculation failure instead returns an explicit error and no usable new preview token

### Requirement: Profile readiness is derived from validated configuration and evidence

The server SHALL derive authoritative readiness from validated structure, review state and the relevant period evidence, independently of client event history or a submitted ready flag. Structurally invalid choices SHALL block activation. Valid reviewed configuration with insufficient readings SHALL be distinguishable as configured-awaiting-data, not incomplete solely because an unchanged default control emitted no event. Apply SHALL retain source-snapshot and expected-revision conflict protection. Readiness exposed to consumers SHALL describe the evidence it actually checks rather than promise every historical period is complete.

#### Scenario: R10 a client cannot forge readiness
- **WHEN** a client submits status=ready for a valid configuration with only one cumulative reading and no usable baseline
- **THEN** the authoritative result reports waiting for sufficient data and does not claim ready period totals

#### Scenario: R10 equivalent reviewed drafts have equivalent readiness
- **WHEN** two otherwise identical reviewed drafts are submitted, one retaining the default denominator and the other switching away and back
- **THEN** both receive the same server-derived readiness and the same publication-relevant diagnostics

#### Scenario: Source changes still invalidate confirmation
- **WHEN** a selected source changes after numeric preview but before activation
- **THEN** apply returns the existing source-conflict response with no profile or receipt mutation, preserving the draft for another preview
