# overview-monthly-consumption-integrity Specification

## Purpose

TBD - created by archiving change 'fix-overview-monthly-consumption'. Update Purpose after archive.

## Requirements

### Requirement: Monthly chart consumes scoped calendar consumption
<!-- requirement-id: E4-R1 -->

The Overview monthly widget SHALL display daily consumption in kWh for the selected site and calendar month from the canonical history projection. Management preview and playback SHALL use their own authorized context paths. The widget SHALL NOT render a lifetime register as a daily amount.

#### Scenario: Correct September values
<!-- scenario-id: E4-R1-S01 -->

- **GIVEN** the CL September projection contains daily 100,0,250 kWh and the KN projection differs
- **WHEN** CL playback or CL management preview renders
- **THEN** only CL September daily consumption is plotted, including the valid zero

#### Scenario: No authorized preview context
<!-- scenario-id: E4-R1-S02 -->

- **GIVEN** the editor has no resolved preview scope
- **WHEN** the widget loads
- **THEN** an actionable context state appears; the server authorization guard is not bypassed

---
### Requirement: Chronology gaps and numeric validity are explicit
<!-- requirement-id: E4-R2 -->

The chart model SHALL sort validated local dates, resolve duplicate dates by projection revision and reject non-finite values. Missing dates SHALL retain calendar positions and break line/area segments. A valid zero SHALL remain a plotted observation.

#### Scenario: Out of order and gap
<!-- scenario-id: E4-R2-S01 -->

- **GIVEN** data for September 3,1,4 is received and September 2 is unavailable
- **WHEN** the model is built
- **THEN** dates are chronological and no line bridges September 1 to September 3 across the missing day

#### Scenario: Single zero and invalid numbers
<!-- scenario-id: E4-R2-S02 -->

- **GIVEN** one day has 0 and other entries contain NaN or Infinity
- **WHEN** the model is rendered
- **THEN** the valid zero has a visible marker; non-finite entries never reach SVG geometry

---
### Requirement: Refresh and errors cannot masquerade as empty data
<!-- requirement-id: E4-R3 -->

The widget SHALL distinguish loading, missing baseline, no observations, authorization failure, transport failure, stale and partial states. Refresh keys SHALL include site and period, and obsolete responses SHALL not overwrite newer context.

#### Scenario: Scope race
<!-- scenario-id: E4-R3-S01 -->

- **GIVEN** a slow CL request remains in flight after switching to KN
- **WHEN** CL resolves after KN
- **THEN** the chart remains KN and the CL response is discarded

#### Scenario: Refresh failure with last good data
<!-- scenario-id: E4-R3-S02 -->

- **GIVEN** a visible month previously loaded successfully
- **WHEN** a later fetch fails
- **THEN** the UI either shows an explicit error or keeps clearly stale last-good data, never labels it fresh

---
### Requirement: Editor and runtime retain the same widget configuration
<!-- requirement-id: E4-R4 -->

The monthly widget SHALL preserve the existing stable widget identity and resolve visibility, geometry and configurable labels through the shared editor configuration. It SHALL NOT introduce page-local constants to bypass saved settings.

#### Scenario: Publish geometry
<!-- scenario-id: E4-R4-S01 -->

- **GIVEN** an operator changes the monthly widget size/position and hides it in a draft
- **WHEN** the page is published
- **THEN** runtime matches the saved geometry and visibility

#### Scenario: Legacy configuration
<!-- scenario-id: E4-R4-S02 -->

- **GIVEN** a page still uses the phasePower widget identifier
- **WHEN** the updated renderer loads
- **THEN** the monthly widget renders without discarding that configuration

---
### Requirement: Monthly reporting does not invent billing semantics
<!-- requirement-id: E4-R5 -->

This change SHALL address the existing Monthly Consumption widget. It SHALL NOT infer a currency tariff or add a price calculation from the ambiguous phrase monthly quotation. Any distinct monetary component SHALL require explicit identification and a separate reviewed contract.

#### Scenario: Consumption is energy
<!-- scenario-id: E4-R5-S01 -->

- **GIVEN** a monthly total is 4300 kWh
- **WHEN** the widget renders
- **THEN** the unit is kWh, not NT$ and not an assumed cost

#### Scenario: Review discovers a monetary card
<!-- scenario-id: E4-R5-S02 -->

- **GIVEN** a later screenshot identifies a different monthly cost component
- **WHEN** scope is reviewed
- **THEN** that additional component is recorded for a separately scoped change rather than claimed fixed by this one

---
### Requirement: Missing overview totals lead to the shared site setup
<!-- requirement-id: E4-R6 -->

The overview monthly consumption widget SHALL follow the reviewed E6 siteTotal reference and offer an authorized management action to U6 with the effective site preselected when configuration is absent. It SHALL not ask operators to locate raw metrics or repurpose a department comparison denominator.

#### Scenario: Set KN chart source
<!-- scenario-id: E4-R6-S01 -->

- **GIVEN** the KN monthly chart lacks a site total source
- **WHEN** the operator opens 設定用電來源
- **THEN** the common site setup opens KN; applying valid configuration refreshes the original widget without requiring duplicate formula setup

#### Scenario: Custom share basis
<!-- scenario-id: E4-R6-S02 -->

- **GIVEN** KN shares compare only production departments
- **WHEN** overview month history renders
- **THEN** the chart still represents the separately configured site total and its correct label
