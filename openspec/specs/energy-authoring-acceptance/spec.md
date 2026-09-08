# energy-authoring-acceptance Specification

## Purpose

TBD - created by archiving change 'verify-energy-authoring-journeys'. Update Purpose after archive.

## Requirements

### Requirement: One fixture reconciles every consumption consumer
<!-- requirement-id: Q1-R1 -->

Integration tests SHALL pass identical accepted meter observations through ingestion, period resolution, history APIs, trend/history consumers, Overview, department shares and editor/runtime rendering. Expected numeric values and quality SHALL match at every layer.

#### Scenario: End to end consumption
<!-- scenario-id: Q1-R1-S01 -->

- **GIVEN** year/month/day baselines are 1000/5000/9000 and latest=9300
- **WHEN** the complete data path executes
- **THEN** year=8300, month=4300, day=300 consistently wherever each period is shown

#### Scenario: Department end to end
<!-- scenario-id: Q1-R1-S02 -->

- **GIVEN** department deltas are 250/150/100 and total=500
- **WHEN** the actual API/story/UI path executes
- **THEN** 50/30/20 percent appears with matching period and denominator metadata


<!-- @trace
source: verify-energy-authoring-journeys
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Source-to-publish journeys preserve isolation and stages
<!-- requirement-id: Q1-R2 -->

Browser journeys SHALL cover guided KN onboarding, compatible metric selection, unsaved preview, draft save, preflight and publication. They SHALL assert CL isolation and distinguish server publication from device acknowledgment.

#### Scenario: KN full journey
<!-- scenario-id: Q1-R2-S01 -->

- **GIVEN** CL and KN share metric names
- **WHEN** KN is onboarded and published through the editor
- **THEN** only intended KN bindings change and CL configuration/history are unchanged

#### Scenario: No device proof
<!-- scenario-id: Q1-R2-S02 -->

- **GIVEN** server publication succeeds without acknowledgment
- **WHEN** the UI reports status
- **THEN** it never displays device-applied


<!-- @trace
source: verify-energy-authoring-journeys
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Failure journeys test boundaries and recovery
<!-- requirement-id: Q1-R3 -->

The integration suite SHALL cover missing period baselines, zero consumption, reset without evidence, duplicate delivery, late data, unit mismatch, conflicting membership, unauthorized preview, save conflicts and stale responses. No journey SHALL replace errors with mock values or fixed percentages.

#### Scenario: Missing year evidence
<!-- scenario-id: Q1-R3-S01 -->

- **GIVEN** a new installation has no year-start observation
- **WHEN** history, Overview and editor are inspected
- **THEN** each relevant surface carries the same unavailable/partial explanation

#### Scenario: Interrupted repair and conflict
<!-- scenario-id: Q1-R3-S02 -->

- **GIVEN** a history activation is interrupted and an editor save conflicts
- **WHEN** recovery paths run
- **THEN** the prior live/projection revision remains and local drafts are preserved


<!-- @trace
source: verify-energy-authoring-journeys
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Fresh visual and task evidence is required
<!-- requirement-id: Q1-R4 -->

The delivery SHALL include fresh playback witness bundles at 1920x1080 and management checks at the three specified desktop sizes. Evidence SHALL record baseline SHA, commands, output, screenshots and gap notes. Visual acceptance SHALL be performed by the user, not inferred from screenshots alone.

#### Scenario: Automated tests pass only
<!-- scenario-id: Q1-R4-S01 -->

- **GIVEN** all targeted tests pass but visual acceptance has not occurred
- **WHEN** closeout is assessed
- **THEN** visual/human acceptance remains pending and the change is not declared launch-ready

#### Scenario: Operator task check
<!-- scenario-id: Q1-R4-S02 -->

- **GIVEN** the operator performs connect-source, edit-card and diagnose-missing-data tasks
- **WHEN** results are recorded
- **THEN** the evidence includes observed completion, required assistance, wrong-scope errors and page switching counts rather than an unsupported usability claim


<!-- @trace
source: verify-energy-authoring-journeys
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Release and rollback gates are explicit
<!-- requirement-id: Q1-R5 -->

The implementation SHALL run affected tests and the actual repository pnpm verify gate, document scoped migration/activation/rollback, and preserve original observations. Archive SHALL require completed evidence and required human acceptance; commit SHALL follow the repository user-confirmation rule.

#### Scenario: Rollback rehearsal
<!-- scenario-id: Q1-R5-S01 -->

- **GIVEN** a staged projection revision has been activated in a test copy
- **WHEN** rollback is requested
- **THEN** the prior revision is restored and original samples/checksums remain unchanged

#### Scenario: Unavailable tool
<!-- scenario-id: Q1-R5-S02 -->

- **GIVEN** the execution environment lacks the project CLI or test dependencies
- **WHEN** verification status is reported
- **THEN** the corresponding check is marked not run, never passed by assumption


<!-- @trace
source: verify-energy-authoring-journeys
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Site accounting must be configured without manuals through the UI
<!-- requirement-id: Q1-R6 -->

End-to-end acceptance SHALL complete U6 initial setup and direct denominator edit with at least three unfamiliar representative operators, using only task goals and prepared sources. Evidence SHALL cover main or parallel-main totals, multi-meter department numerators, independent CL/KN bases, duplicate recovery, missing baselines, and profile-vs-page side effects. Four logical setup screens and zero required formula/key input are release criteria, not measured claims until tested.

#### Scenario: UI-driven meter assignment
<!-- scenario-id: Q1-R6-S01 -->

- **GIVEN** prepared CL and KN sources have distinct identities and known period deltas
- **WHEN** operators configure KN totals and departments entirely in the UI
- **THEN** the saved profile, history API, overview and circuit shares reconcile, while CL is unchanged

#### Scenario: No training substitution
<!-- scenario-id: Q1-R6-S02 -->

- **GIVEN** one unfamiliar operator cannot locate or complete the denominator edit
- **WHEN** usability results are reviewed
- **THEN** that critical task remains failed; reading a manual or receiving instructions afterward cannot be counted as first-time unassisted success


<!-- @trace
source: verify-energy-authoring-journeys
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: End-to-end acceptance starts before any tag mapping exists
<!-- requirement-id: Q1-R7 -->

Integration acceptance SHALL begin with an authorized broker fixture containing observed but unmapped KN sources, not only a pre-populated metric catalog. It SHALL cover M1 capture through M2 stable tag selection, E1 accepted decimal readings, E2 period deltas, E6 accounting, E4 monthly consumption and E5 department shares, then U6/U4/U5 preview and publishing. At least one feed SHALL multiplex tags on one topic and another SHALL reorder tagged array records. External clients, manual selector typing or coaching SHALL not be necessary for operator acceptance; test harness publishers are fixtures, not operator prerequisites.

#### Scenario: From packets to percentages
<!-- scenario-id: Q1-R7-S01 -->

- **GIVEN** synthetic baselines and subsequent MAIN/STAMP tag packets are supplied by a test harness
- **WHEN** an uncoached operator performs setup through the product UI
- **THEN** the accepted meters remain distinct and same-period usage/share results match the reviewed fixtures across API and screens

#### Scenario: Side-effect and cleanup regression
<!-- scenario-id: Q1-R7-S02 -->

- **GIVEN** capture, preview, failed apply, reconnect and cancellation are exercised
- **WHEN** integration evidence is collected
- **THEN** no mock value enters live energy history, production subscriptions survive, legacy edits preserve selectors and duplicate applies create no extra sources

<!-- @trace
source: verify-energy-authoring-journeys
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->