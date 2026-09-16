## MODIFIED Requirements

### Requirement: Configured-source onboarding is a three-stage task
<!-- requirement-id: M2-R1 -->

With an authorized connection and approved reception scope, the normal task SHALL be one integrated surface with three stages: receive/select observations, select fields or tags and review their meaning, then preview and apply. It SHALL inherit site and originating profile field, support multiple selected meters, and require no external MQTT client, manual topic copying, hand-written extraction path, internal metric key, or formula. Already observed and reviewed sources SHALL skip unnecessary capture or connection setup. Three stages SHALL not be advertised as three mouse clicks for any number of meters. Missing prerequisites SHALL be resolved without replacing the normal task with a repeated connection/site wizard. Real MQTT publication SHALL be optional diagnostics, not a required completion step.

#### Scenario: Return from KN total picker
<!-- scenario-id: M2-R1-S01 -->

- **GIVEN** the KN total-meter picker opens add from received data
- **WHEN** the operator completes the three stages
- **THEN** eligible sources return to the same picker with KN and all other profile draft values preserved

#### Scenario: Connection already configured
<!-- scenario-id: M2-R1-S02 -->

- **GIVEN** the existing broker and KN reception group are authorized
- **WHEN** the operator selects ten known candidates
- **THEN** the task does not require ten connections, ten wizard restarts or ten external topic lookups

#### Scenario: Prerequisite is missing
<!-- scenario-id: M2-R1-S03 -->

- **GIVEN** a task draft exists but no approved reception scope is configured
- **WHEN** an authorized operator configures that prerequisite
- **THEN** the same task resumes without losing site or other reviewed values

#### Scenario: No real publish required
<!-- scenario-id: M2-R1-S04 -->

- **GIVEN** a source has been validly previewed and applied
- **WHEN** the task reports its saved/pending runtime result
- **THEN** completion does not require sending a synthetic MQTT value

## ADDED Requirements

### Requirement: Mapping review presents evidence and invalidates stale decisions
<!-- requirement-id: DHM-R1 -->

The mapping workspace SHALL show source identity, selected evidence revision and origin, reviewed semantics, normalized result and canonical before/after changes. Upstream edits SHALL invalidate only dependent review evidence and require a fresh preview before apply. Unsupported or ambiguous selection SHALL not silently choose a field or replace a value.

#### Scenario: Changed upstream field
<!-- scenario-id: DHM-R1-S01 -->

- **GIVEN** a preview binds a cumulative energy field
- **WHEN** the operator selects power instead
- **THEN** the preview is invalidated and apply is disabled until the new meaning is reviewed

#### Scenario: Ambiguous tag
<!-- scenario-id: DHM-R1-S02 -->

- **GIVEN** two records match the chosen stable tag identity
- **WHEN** the selector preview runs
- **THEN** the row shows ambiguous identity and no first-match or zero fallback is offered

#### Scenario: Temporary numeric input
<!-- scenario-id: DHM-R1-S03 -->

- **GIVEN** the operator clears multiplier or types a partial decimal
- **WHEN** the field changes
- **THEN** the raw input remains available for correction and is not silently replaced with 1

#### Scenario: Offline preview
<!-- scenario-id: DHM-R1-S04 -->

- **GIVEN** a valid example is pasted rather than received live
- **WHEN** normalization succeeds
- **THEN** the result remains labeled offline evidence and does not claim fresh formal measurement

### Requirement: Apply results separate persistence from reception readiness
<!-- requirement-id: DHM-R2 -->

The completion surface SHALL distinguish database persistence, runtime activation, reception observation and measurement freshness. It SHALL preserve the reviewed draft after retryable errors, use the original idempotency key for an uncertain apply result, and return to the authorized initiating task without independently changing its other settings.

#### Scenario: Runtime rejects subscription
<!-- scenario-id: DHM-R2-S01 -->

- **GIVEN** a source transaction commits but the runtime subscription is refused
- **WHEN** the completion surface renders
- **THEN** it shows saved but not receiving with the supported recovery action

#### Scenario: Apply response lost
<!-- scenario-id: DHM-R2-S02 -->

- **GIVEN** a valid apply commits but its response was lost
- **WHEN** the operator retries through the UI
- **THEN** the original idempotency key and canonical request are reused

#### Scenario: Single cumulative sample
<!-- scenario-id: DHM-R2-S03 -->

- **GIVEN** only one cumulative observation was used for preview
- **WHEN** the new source is configured
- **THEN** the result does not claim period consumption baselines are available

### Requirement: Actual publish diagnostics require the selected persisted target
<!-- requirement-id: DHM-R3 -->

Actual MQTT publish diagnostics SHALL be visually and operationally separate from parsing preview. They SHALL resolve the selected persisted metric/source target server-side and show a time-bounded confirmation of exact target and content. The UI SHALL not substitute a fixed metric identity, reuse a confirmation after the target/value changes, automatically retry uncertain publications or require publish for onboarding completion.

#### Scenario: Non-consumption metric selected
<!-- scenario-id: DHM-R3-S01 -->

- **GIVEN** a source other than consumptionEnergy is selected
- **WHEN** publish diagnostics are opened
- **THEN** the target is resolved for that selected persisted source or blocked as unsupported, never silently replaced

#### Scenario: Value changes after confirmation
<!-- scenario-id: DHM-R3-S02 -->

- **GIVEN** a server-issued confirmation shows one value and target
- **WHEN** the user changes either
- **THEN** the old confirmation is invalid and a new confirmation is required

#### Scenario: Uncertain publish result
<!-- scenario-id: DHM-R3-S03 -->

- **GIVEN** the publication response is lost
- **WHEN** the UI reports the outcome
- **THEN** it says the outcome is unconfirmed and does not automatically resend or assert nothing was sent

### Requirement: Onboarding respects upstream publication contracts and accounting identity
<!-- requirement-id: DHM-R4 -->

Onboarding SHALL reuse managed Solar canonical sources, admit physical raw channels through their reviewed E1 protocol, and admit authoritative engineering results through the typed KNE/EPR workflow without fake physical identities. Unreviewed comparison sums, snapshots and control/health messages SHALL not become accounting inputs. Calculated engineering results SHALL not be excluded solely because they aggregate upstream measurements. The proposed opc-power-v1 envelope SHALL require F protocol validation before existing M2 extraction and SHALL NOT be treated as supported by a value-only selector. Source event time SHALL NOT be fabricated from legacy ts, readAt or publishedAt. Engineering daily reports SHALL instead validate explicit report periods; counter/power modes SHALL validate genuine upstream aggregate checkpoints. Their handlers SHALL disable automatic timestamp-name fallback and use mode-specific semantics. Actual test publish SHALL be denied for managed canonical Solar and control/state targets and SHALL use an explicitly authorized test target rather than default production measurements.

#### Scenario: Legacy publication timestamp
<!-- scenario-id: DHM-R4-S01 -->

- **GIVEN** a legacy opc message has value, unit and publication ts
- **WHEN** an energy binding is reviewed
- **THEN** ts is labeled publication time, not selected as trustworthy source time; unsupported time policy blocks admission

#### Scenario: New power schema pending implementation
<!-- scenario-id: DHM-R4-S02 -->

- **GIVEN** a v1 power envelope is observed but its validator is unavailable
- **WHEN** the user previews or applies
- **THEN** the UI offers diagnostic inspection and explicitly blocks activation rather than claiming schema support through $.value

#### Scenario: Physical meter double representation
<!-- scenario-id: DHM-R4-S03 -->

- **GIVEN** legacy and v1 streams represent the same reviewed meter/channel
- **WHEN** migration is applied
- **THEN** one canonical writer remains active, cutover is reviewed, and no double baseline or energy is produced

#### Scenario: Virtual membership changes
<!-- scenario-id: DHM-R4-S04 -->

- **GIVEN** a publisher changes an unreviewed comparison-sum membership
- **WHEN** the next aggregate is selected
- **THEN** the configuration revision is visible and the sum cannot be differenced as a continuous physical counter or auto-selected as site total; separately approved engineering definitions follow G effective-period rules
