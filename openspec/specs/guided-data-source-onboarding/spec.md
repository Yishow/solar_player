# guided-data-source-onboarding Specification

## Purpose

TBD - created by archiving change 'add-guided-data-source-onboarding'. Update Purpose after archive.

## Requirements

### Requirement: Source onboarding follows resumable task stages
<!-- requirement-id: U2-R1 -->

The wizard SHALL cover source/site selection, connection confirmation, field extraction, and result/impact confirmation before save. These are responsibilities, not mandatory separate screens: MQTT with an approved connection and reception scope SHALL use the M2 three-stage task and skip already answered questions. Back navigation and retry SHALL preserve non-sensitive draft input. Expert editing SHALL reuse the same validation without forcing the wizard.

#### Scenario: Retry connection
<!-- scenario-id: U2-R1-S01 -->

- **GIVEN** the operator has entered a KN source and the broker test fails
- **WHEN** they retry or return to the prior step
- **THEN** their source choices remain and no duplicate mapping is created

#### Scenario: Managed source selected
<!-- scenario-id: U2-R1-S02 -->

- **GIVEN** a Solar-managed metric is chosen
- **WHEN** the wizard opens its details
- **THEN** it offers selection/diagnosis, not an editable generic replacement

---
### Requirement: Measurement meaning is chosen before energy activation
<!-- requirement-id: U2-R2 -->

Energy onboarding SHALL require explicit cumulative-energy, interval-energy or power-gauge semantics and compatible units. Cumulative examples SHALL explain subtraction and baseline availability. A single sample SHALL not be presented as a period consumption amount.

#### Scenario: Cumulative example
<!-- scenario-id: U2-R2-S01 -->

- **GIVEN** samples read 10000 and 10125 kWh
- **WHEN** the operator selects cumulative-energy
- **THEN** the preview explains 125 kWh observed difference, not 20125 or a full month without baseline

#### Scenario: Invalid multiplier input
<!-- scenario-id: U2-R2-S02 -->

- **GIVEN** the multiplier field is blank or zero for energy
- **WHEN** save is attempted
- **THEN** a field error appears and the draft is not silently changed to 1

---
### Requirement: Payload extraction preview is read-only and bounded
<!-- requirement-id: U2-R3 -->

A mapping preview SHALL use the same supported extraction and normalization rules as ingestion, enforce management authorization and payload limits, and redact secrets. It SHALL NOT publish MQTT messages, update live readings, or mutate history.

#### Scenario: Select sample field
<!-- scenario-id: U2-R3-S01 -->

- **GIVEN** a valid JSON sample contains a supported numeric field
- **WHEN** the operator selects it
- **THEN** the path and normalized value match the ingestion parser with no persisted metric changes

#### Scenario: Unsupported expression
<!-- scenario-id: U2-R3-S02 -->

- **GIVEN** a path is unsupported by the production parser
- **WHEN** preview is requested
- **THEN** a precise validation error is returned instead of an apparently successful client-only preview

---
### Requirement: Real test publishing is separated from local testing
<!-- requirement-id: U2-R4 -->

Actual MQTT test publish SHALL be a distinct privileged action with explicit target, scope, value, impact and confirmation. Connection success SHALL NOT imply mapping correctness. Test publish SHALL NOT be retained by default or triggered by preview.

#### Scenario: Local preview
<!-- scenario-id: U2-R4-S01 -->

- **GIVEN** the operator presses preview extracted value
- **WHEN** the server handles the request
- **THEN** MQTT publish count remains zero

#### Scenario: Confirm real publish
<!-- scenario-id: U2-R4-S02 -->

- **GIVEN** the operator chooses the separate real-publish action
- **WHEN** confirmation lists broker/topic/site/value
- **THEN** only the confirmed write is sent under existing authorization and the result reports that it was an actual publish

---
### Requirement: Source mutations preserve identity ownership and concurrent work
<!-- requirement-id: U2-R5 -->

Source mutation SHALL validate uniqueness and ownership on the server, protect other scopes, and detect stale versions. A destructive change SHALL disclose dependent drafts, live pages and derived metrics. Unknown impact SHALL not be treated as no impact.

#### Scenario: Concurrent save
<!-- scenario-id: U2-R5-S01 -->

- **GIVEN** two operators edit the same source revision
- **WHEN** the second saves after the first
- **THEN** a conflict response preserves the second draft and offers comparison/reload rather than blind overwrite

#### Scenario: Delete referenced source
<!-- scenario-id: U2-R5-S02 -->

- **GIVEN** a source is used by a published card and a draft
- **WHEN** deletion is requested
- **THEN** both dependencies are shown and unsafe deletion is blocked until explicitly resolved

---
### Requirement: Successful onboarding hands off only safe identity
<!-- requirement-id: U2-R6 -->

After successful save the wizard SHALL offer a display-authoring handoff carrying the saved metric identity and concrete site. It SHALL not automatically publish a page, include credentials/raw payload in URLs, or claim live data readiness when only a sample or baseline exists.

#### Scenario: Continue to display
<!-- scenario-id: U2-R6-S01 -->

- **GIVEN** a reviewed KN source is saved
- **WHEN** the operator chooses use on a display
- **THEN** the saved KN identity is available to the target picker and formal playback remains unchanged

#### Scenario: Saved without live sample
<!-- scenario-id: U2-R6-S02 -->

- **GIVEN** the mapping is valid but no real message has arrived
- **WHEN** save succeeds
- **THEN** the status says configured/waiting for data, not live or ready-to-publish

---
### Requirement: Source onboarding returns into energy setup without requiring technical identifiers
<!-- requirement-id: U2-R7 -->

When invoked by U6, onboarding SHALL inherit the concrete site and target field and return its eligible source reference to that field. Normal confirmed-source operation SHALL generate technical identities and mapping paths where supported; unreviewed legacy source semantics SHALL have an inline review path. Additional connector setup is distinct from the four-screen ready-source task.

#### Scenario: Return to department
<!-- scenario-id: U2-R7-S01 -->

- **GIVEN** KN stamping setup opens onboarding
- **WHEN** one eligible meter source is confirmed and saved
- **THEN** the user returns to stamping with its new source available, with no retyping of metric key or loss of other rows

#### Scenario: Unreviewed existing source
<!-- scenario-id: U2-R7-S02 -->

- **GIVEN** a legacy source already receives cumulative energy but lacks verified semantics
- **WHEN** the operator selects review from the picker
- **THEN** the existing identity is preserved and reviewed in place rather than deleted and recreated

---
### Requirement: MQTT observation selection precedes manual mapping fields
<!-- requirement-id: U2-R8 -->

For MQTT the default onboarding SHALL delegate to M1/M2 observation selection and batch mapping rather than asking operators to supply topic or valuePath first. Its normal authorized-source path SHALL use the M2 three-stage contract, superseding the generic four-step screen count for this source kind; mandatory new-connection setup remains an inline exception. Generic orchestration SHALL not duplicate discovery, selector validation, commit state or profile ownership.

#### Scenario: Known broker unknown tag
<!-- scenario-id: U2-R8-S01 -->

- **GIVEN** an operator only knows they need KN cumulative energy
- **WHEN** they start MQTT onboarding
- **THEN** they choose from actual observations, confirm meaning and target, preview and apply without an external client

#### Scenario: Single-field repair
<!-- scenario-id: U2-R8-S02 -->

- **GIVEN** one already configured source needs a new compatible field
- **WHEN** the user opens repair
- **THEN** M2 retains the target and site and only presents the relevant selection and review
