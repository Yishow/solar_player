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

A destructive change SHALL be blocked only by a dependency an operator can resolve: a draft page binding, a published live page's widget binding, or a derived metric input. A playback story or readiness expectation that the display code registers for a destination SHALL be disclosed as a structural expectation and SHALL NOT block the change, because no operator action can clear it. The source-impact read SHALL report resolvable dependencies and structural expectations as separate sets, and SHALL report an empty set rather than omitting either one. This distinction SHALL apply identically to guided apply and direct source management.

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

#### Scenario: A registered expectation alone does not block a destructive change

- **GIVEN** a destination carries a registered playback or readiness expectation and no draft binding, published live page widget binding or derived metric input
- **WHEN** an authorized operator disables that source or moves it to another destination
- **THEN** the change is applied, the source and its mapping reach the same enabled state, and the registered expectation is still reported as a structural expectation rather than as a blocking dependency

##### Example: disabling a source whose destination only has registered expectations

- **GIVEN** the KN source on channel `kn-main` sends to `consumptionEnergy`, the display code registers that destination as a playback story and readiness expectation, and no draft, live page widget or derived metric input references it
- **WHEN** an authorized operator disables that source through guided apply or through direct source management
- **THEN** both entry points succeed, the source and its mapping are both disabled, and the source-impact read reports that mutation is allowed while still listing the registered expectations

#### Scenario: A resolvable dependency still blocks a destructive change

- **GIVEN** a destination is referenced by a draft binding, by a published live page's widget binding, or by a derived metric input
- **WHEN** an authorized operator disables that source or moves it to another destination
- **THEN** the change is rejected with the existing in-use conflict, the source, mapping, audit records and receipts are unchanged, and no subscription reconciliation is invoked

##### Example: which dependency kinds decide a destructive change

| Dependency on the destination | Destructive change |
|---|---|
| Draft page binding | rejected with `E1_SOURCE_IN_USE` |
| Published live page widget binding | rejected with `E1_SOURCE_IN_USE` |
| Derived metric input | rejected with `E1_SOURCE_IN_USE` |
| Registered playback story or readiness expectation only | applied, expectation still disclosed |
| Impact lookup failed | rejected with `E1_SOURCE_IMPACT_UNKNOWN` |

#### Scenario: A failed impact lookup is still not an empty dependency set

- **WHEN** the source-impact lookup cannot be established for an otherwise valid destructive change
- **THEN** the change is rejected as unknown impact, both the resolvable dependency set and the structural expectation set are reported as empty, and no source, mapping, audit, receipt or runtime mutation occurs


<!-- @trace
source: fix-registered-metric-dependency-classification
updated: 2026-09-09
code:
  - docs/reviews/2026-09-08-mqtt-runtime-safety-review.md
  - apps/server/src/services/sourceImpactService.ts
tests:
  - apps/server/src/services/guidedMqttMappingService.test.ts
  - apps/server/src/routes/site-energy-profiles.test.ts
  - apps/server/src/services/sourceImpactService.test.ts
  - apps/server/src/routes/meter-sources.test.ts
-->

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

---
### Requirement: The routed onboarding task supplies real mapping evidence

The normal Data Hub onboarding entry SHALL let an authorized operator obtain a bounded actual or explicitly offline sample, select a concrete source and exact topic, review measurement semantics, preview extraction, and apply without developer-supplied component inputs. The selected site, source, sample identity and draft SHALL survive step navigation. Empty, unauthorized, expired and disconnected observation states SHALL remain distinguishable and recoverable.

#### Scenario: R3 normal entry reaches mapping preview
- **WHEN** an operator enters the KN connect-data task with an approved reception scope and receives a synthetic broker packet within that scope
- **THEN** the routed task displays selectable fields, carries the selected source and topic into preview, and permits confirmed apply without a manual topic copy or injected child-component fixture

#### Scenario: R3 no observation is not an unrecoverable wizard
- **WHEN** an approved capture is silent or its sample expires while a draft exists
- **THEN** the task preserves the draft and offers capture retry or a bounded labeled offline example, without claiming the source is live


<!-- @trace
source: fix-mqtt-guided-source-activation
updated: 2026-09-08
code:
  - apps/server/src/services/guidedMappingActivationService.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/app.ts
  - apps/server/src/routes/settings-mqtt.ts
  - docs/reviews/2026-09-08-energy-authoring-review.md
  - apps/server/src/mqtt/discoveryTransport.ts
  - apps/server/src/routes/site-energy-profiles.ts
  - packages/shared/src/meterReading.ts
  - apps/server/src/services/mqttObservationCatalogService.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/server/src/routes/mqtt-captures.ts
  - apps/web/src/pages/DataHub/GuidedMqttMappingPanel.tsx
  - packages/shared/src/guidedMqttMapping.ts
  - packages/shared/src/mqttObservation.ts
  - apps/server/src/services/mqttMeterIngest.ts
  - apps/server/src/services/mqttTestPublishConfirmationService.ts
tests:
  - apps/web/src/pages/DataHub/GuidedOnboardingJourney.test.tsx
  - apps/server/src/routes/mqtt-test-publish-confirmation.test.ts
  - apps/server/src/mqtt/mqttPowerSelectorIngest.test.ts
  - apps/server/src/routes/mqtt-guided-activation.test.ts
  - apps/server/src/routes/mqtt-capture-samples.test.ts
-->

---
### Requirement: MQTT test confirmation binds the actual resolved publish target

A real test-publish confirmation SHALL show the actual authorized broker reference, exact resolved topic, site, metric identity, value, payload representation and retain setting that will be sent. Confirmation SHALL be tied to the current target configuration and payload. Target or payload changes SHALL invalidate confirmation before any publish. The onboarding task SHALL NOT invent a topic or use a fixed production test reading as a substitute for operator-reviewed input. Read-only parsing preview and cancellation SHALL publish nothing.

#### Scenario: R4 configured topic differs from a naming convention
- **WHEN** KN consumptionEnergy is configured on factory/kn/main rather than kn/kn-main and the operator requests a test
- **THEN** confirmation shows factory/kn/main and the exact reviewed payload; confirmed publishing sends only that payload to that resolved target with retain=false by default

#### Scenario: R4 mapping changes while confirmation is open
- **WHEN** the source topic or broker configuration changes after the operator opens confirmation
- **THEN** the server rejects the stale confirmation with zero broker publishes and the UI requires a fresh target review without discarding the entered value

#### Scenario: R4 preview and cancel have no broker side effects
- **WHEN** an operator parses an example or cancels a real-publish confirmation
- **THEN** no publish is attempted and no accepted reading, live value or baseline is created by that action

<!-- @trace
source: fix-mqtt-guided-source-activation
updated: 2026-09-08
code:
  - apps/server/src/services/guidedMappingActivationService.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/app.ts
  - apps/server/src/routes/settings-mqtt.ts
  - docs/reviews/2026-09-08-energy-authoring-review.md
  - apps/server/src/mqtt/discoveryTransport.ts
  - apps/server/src/routes/site-energy-profiles.ts
  - packages/shared/src/meterReading.ts
  - apps/server/src/services/mqttObservationCatalogService.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/server/src/routes/mqtt-captures.ts
  - apps/web/src/pages/DataHub/GuidedMqttMappingPanel.tsx
  - packages/shared/src/guidedMqttMapping.ts
  - packages/shared/src/mqttObservation.ts
  - apps/server/src/services/mqttMeterIngest.ts
  - apps/server/src/services/mqttTestPublishConfirmationService.ts
tests:
  - apps/web/src/pages/DataHub/GuidedOnboardingJourney.test.tsx
  - apps/server/src/routes/mqtt-test-publish-confirmation.test.ts
  - apps/server/src/mqtt/mqttPowerSelectorIngest.test.ts
  - apps/server/src/routes/mqtt-guided-activation.test.ts
  - apps/server/src/routes/mqtt-capture-samples.test.ts
-->