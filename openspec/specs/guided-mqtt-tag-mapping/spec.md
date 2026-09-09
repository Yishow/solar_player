# guided-mqtt-tag-mapping Specification

## Purpose

TBD - created by archiving change 'add-guided-mqtt-tag-mapping'. Update Purpose after archive.

## Requirements

### Requirement: Configured-source onboarding is a three-stage task
<!-- requirement-id: M2-R1 -->

With an authorized connection and approved reception scope, the normal task SHALL be one integrated surface with three stages: receive/select observations, select fields or tags and review their meaning, then preview and apply. It SHALL inherit site and originating profile field, support multiple selected meters, and require no external MQTT client, manual topic copying, hand-written extraction path, internal metric key, or formula. Already observed and reviewed sources SHALL skip unnecessary capture or connection setup. Three stages SHALL not be advertised as three mouse clicks for any number of meters.

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

---
### Requirement: Source and value selection is visual and reversible
<!-- requirement-id: M2-R2 -->

The UI SHALL render observed scalar values, object fields and tag samples as selectable rows with human name, tag claim, unit, sample value, freshness and current usage. Selecting a row SHALL compile its supported extraction rule and show a readable summary. Topic and compiled selector details SHALL remain inspectable as secondary information. Technical identities SHALL be generated server-side or chosen through an existing-target picker; labels may be edited without changing identity.

#### Scenario: Pick nested cumulative field
<!-- scenario-id: M2-R2-S01 -->

- **GIVEN** a JSON packet contains measurements.importEnergy and activePower
- **WHEN** the operator selects importEnergy
- **THEN** the selector is generated without typing a path and the power field is not selected as energy

#### Scenario: Change a display name
<!-- scenario-id: M2-R2-S02 -->

- **GIVEN** a source already has a reviewed stable identity
- **WHEN** its Chinese name is edited
- **THEN** the meter ID, profile references and history epoch remain unchanged

---
### Requirement: Multiplexed tags use explicit identity selectors
<!-- requirement-id: M2-R3 -->

Bindings SHALL distinguish subscription filters, exact received topics, source tag identity and destination metric identity. A packet-per-tag feed SHALL store an explicit allowlisted equality selector, such as tag equals MAIN, before reading its value. Tag arrays SHALL select by reviewed stable keys rather than positional index, and SHALL require exactly one matching record. Missing identity, multiple matches or changed identity SHALL reject that observation for the affected binding without writing zero, using a previous tag value or taking the first row. Type and case comparisons SHALL be explicit and deterministic.

#### Scenario: Two tags share a topic
<!-- scenario-id: M2-R3-S01 -->

- **GIVEN** packets on one topic alternate tag MAIN value 1000 and tag STAMP value 200
- **WHEN** the MAIN binding processes them
- **THEN** only MAIN updates that meter and the STAMP packet cannot change its value or baseline

#### Scenario: Array order changes
<!-- scenario-id: M2-R3-S02 -->

- **GIVEN** a reviewed binding selects tag MAIN in an array
- **WHEN** MAIN moves from index 0 to index 3
- **THEN** the same meter is updated using tag identity and not the value now at index 0

#### Scenario: Duplicate tag in one packet
<!-- scenario-id: M2-R3-S03 -->

- **GIVEN** two array records both match MAIN
- **WHEN** the binding is evaluated
- **THEN** that binding reports ambiguous identity and emits no accepted reading

---
### Requirement: Supported extraction shapes share one bounded production engine
<!-- requirement-id: M2-R4 -->

Initial support SHALL cover scalar numeric payloads, JSON nested numeric fields, a single JSON tag/value record per packet, and a JSON array of tag/value records. Object keys SHALL use tokenized property access so literal dots and bracket characters are not confused with paths. Raw numeric lexemes and numeric strings SHALL be preserved for E1 decimal normalization; unsafe numeric conversion before subtraction SHALL not be allowed. Only allowlisted selectors SHALL execute; arbitrary JavaScript, unrestricted JSONPath expressions, script evaluation, and unimplemented binary codecs SHALL be rejected. Preview and runtime SHALL use the same versioned extraction contract.

#### Scenario: Literal dotted key
<!-- scenario-id: M2-R4-S01 -->

- **GIVEN** a payload has the literal key meter.total and also nested meter.total
- **WHEN** one candidate is selected
- **THEN** the compiled property tokens identify the selected value unambiguously in preview and runtime

#### Scenario: High precision counter
<!-- scenario-id: M2-R4-S02 -->

- **GIVEN** source lexemes are 9007199254740992.000 and 9007199254740992.125
- **WHEN** selection and ingestion normalize them
- **THEN** E1 receives exact decimal values permitting a 0.125 kWh difference without JavaScript precision loss

#### Scenario: Unsupported binary payload
<!-- scenario-id: M2-R4-S03 -->

- **GIVEN** a candidate payload requires an unimplemented vendor codec
- **WHEN** the operator selects it
- **THEN** the UI says the format is unsupported and offers an example or supported decoder configuration rather than claiming successful mapping

---
### Requirement: Measurement meaning is confirmed rather than guessed
<!-- requirement-id: M2-R5 -->

The operator SHALL confirm cumulative-energy, interval-energy or power-gauge semantics, `energyFlowRole`, unit, scaling policy, and `timestampPolicy` before activation. The default `timestampPolicy` SHALL be `source-required`; `allow-receive-time-estimate` SHALL require an explicitly audited source revision and SHALL apply only under the approved E1 transport predicate. `sourceTimestampTimeZone` SHALL be provided only when needed to parse an offset-free source timestamp. Scalar values with no timestamp and timestamps that already contain an offset or `Z` SHALL retain explicit null/absent timezone state and SHALL not require an arbitrary timezone choice. Compatible reviewed templates MAY fill these settings for a batch, but mixed or unknown units SHALL be individually flagged. Increasing samples and field names MAY suggest cumulative energy but SHALL NOT prove it. CT/PT scaling already applied upstream SHALL not be applied a second time. A cumulative source SHALL feed E1/E2 and show baseline availability, not a raw total mislabeled as daily consumption. Total-meter ownership, department membership, and denominator selection SHALL remain an explicitly reviewed E6 profile decision and SHALL not be duplicated in the E1 source mapping.

#### Scenario: Cumulative batch
<!-- scenario-id: M2-R5-S01 -->

- **GIVEN** ten reviewed counters use kWh and no additional multiplier
- **WHEN** the operator confirms the shared cumulative-energy template
- **THEN** all ten get explicit semantics without ten formula editors, while daily/monthly/yearly values still await appropriate baselines

#### Scenario: Power and unscaled register mixed
<!-- scenario-id: M2-R5-S02 -->

- **GIVEN** some candidates use kW and another has an unknown raw register factor
- **WHEN** a kWh batch template is chosen
- **THEN** incompatible or uncertain rows require correction and are not silently enabled as cumulative kWh

---
### Requirement: Suggestions have visible evidence and require target confirmation
<!-- requirement-id: M2-R6 -->

Suggestions SHALL be based on approved recipes, declared metadata and observed structure, with their reason visible. Names and high numeric magnitude SHALL not decide physical total-meter ownership, department membership, topology or denominator. Ambiguous source tag aliases or existing targets SHALL require selection. Source-selection shortcuts SHALL not rewrite the per-site E6 profile until the reviewed profile change is included in the apply action.

#### Scenario: Highest counter is not necessarily main
<!-- scenario-id: M2-R6-S01 -->

- **GIVEN** a department counter has the largest lifetime value
- **WHEN** suggestions are generated
- **THEN** it is not automatically selected as the site denominator or main meter

#### Scenario: Two MAIN candidates
<!-- scenario-id: M2-R6-S02 -->

- **GIVEN** two approved namespaces contain a tag named MAIN
- **WHEN** the user searches MAIN
- **THEN** both show distinguishable topic or device evidence and no target is chosen silently

---
### Requirement: Batch setup reuses reviewed structure without cloning identities
<!-- requirement-id: M2-R7 -->

The UI SHALL support multi-select, per-row edits, apply-to-selected compatible settings, and an explicit template recipe for repeated devices. Applying a recipe SHALL preview a diff and generate distinct source and metric identities from reviewed stable inputs. It SHALL reuse existing identical bindings, reject conflicting duplicates, preserve unselected items, and never copy CL physical meter IDs into KN. Partial batch selection SHALL identify excluded or unresolved rows; success SHALL not imply all site meters were discovered.

#### Scenario: Repeat known format
<!-- scenario-id: M2-R7-S01 -->

- **GIVEN** twenty observed KN records share a reviewed extraction structure
- **WHEN** the operator applies its recipe and reviews targets
- **THEN** selectors and shared units are filled in bulk while identities remain distinct and only unresolved rows need manual correction

#### Scenario: Rerun the same batch
<!-- scenario-id: M2-R7-S02 -->

- **GIVEN** ten identical bindings already exist
- **WHEN** the same recipe is applied again
- **THEN** the UI reports existing matches and does not create another ten meters

---
### Requirement: Draft preview never publishes or changes readings
<!-- requirement-id: M2-R8 -->

Preview SHALL evaluate the exact reviewed selector, semantics, scaling, and `timestampPolicy` against bounded evidence and negative/control samples using the production extraction engine. It SHALL show raw selected values, normalized values, match/no-match results, evidence origin and observation times. The response SHALL contain an opaque server-issued `previewToken` and the server-normalized `canonicalDraft`; the UI SHALL review and display that canonicalDraft, and apply SHALL return the same content rather than rebuilding it from mutable client state. The token SHALL bind the canonical draft, selected item set, target/site/physical identities, measurement semantics including timestampPolicy and explicit null/absent timezone state, optional E6 mutation, source/profile/candidate/sample revisions, review evidence snapshot, and expiry. It SHALL NOT publish MQTT, persist live values, update domain live values or meter baselines, activate profiles, save page drafts or replay captured packets into energy history. Token/review-snapshot persistence is control evidence and SHALL not be treated as a domain mutation. Simulated examples SHALL remain distinct from live evidence.

#### Scenario: Preview has no side effects
<!-- scenario-id: M2-R8-S01 -->

- **GIVEN** an operator previews an uncommitted source batch
- **WHEN** multiple positive and negative samples are evaluated
- **THEN** only preview output and its token/review evidence control record change; MQTT publish count and domain live/history/baseline/profile/page state stay unchanged

#### Scenario: First sample is not a month
<!-- scenario-id: M2-R8-S02 -->

- **GIVEN** one cumulative reading is available
- **WHEN** the preview succeeds
- **THEN** the UI confirms extraction but says insufficient period baseline rather than claiming a valid monthly usage

---
### Requirement: Apply is versioned idempotent and honest about runtime activation
<!-- requirement-id: M2-R9 -->

Apply SHALL validate authorization and SHALL require an opaque `previewToken`, the exact server-normalized `canonicalDraft` returned by preview and shown to the operator, and an idempotency key. The canonical draft SHALL include every selector field including selector version and expected schema, the selected item set, target/site/physical identities, `measurementKind`, `energyFlowRole`, unit, scaling, `timestampPolicy` including its default or audited source revision, an optional `sourceTimestampTimeZone` only when an offset-free source timestamp needs parsing, explicit null/absent timezone state otherwise, optional E6 mutation, source/profile/candidate/sample revisions, and the review evidence snapshot binding. The server SHALL canonicalize and hash the token plus draft; an arbitrary client-provided hash SHALL not substitute for the token. Any selector, target, semantic, selected-row, optional mutation, evidence, or revision change SHALL require a new preview and SHALL return `409` with zero writes. An expired token or stale revision SHALL return `409` with zero writes. After authorization, an existing committed idempotency key with the same canonical request hash SHALL return its original result even if the token later expires or revisions advance; the same key with a different hash SHALL return `409` conflict. For a first apply, token and revision checks SHALL be repeated immediately before transaction commit to prevent TOCTOU. Selected source bindings and explicitly included E6 profile changes SHALL be committed atomically in the database; unrelated mappings SHALL not be replaced. Runtime exact-topic subscription reconciliation SHALL be staged and observable after commit, with retryable pending or failed status and no false live-success claim. No observation captured before activation SHALL be replayed as newly measured usage.

#### Scenario: Request retry after timeout
<!-- scenario-id: M2-R9-S01 -->

- **GIVEN** a batch transaction commits but the response is lost
- **WHEN** the UI retries using the same idempotency key
- **THEN** the existing result is returned without duplicate sources or resets

#### Scenario: Broker rejects activation
<!-- scenario-id: M2-R9-S02 -->

- **GIVEN** source settings are saved but required runtime subscription is refused
- **WHEN** apply results are displayed
- **THEN** the UI reports saved but reception not active and offers retry; it does not report complete/live or inject preview values

#### Scenario: Concurrent target edit
<!-- scenario-id: M2-R9-S03 -->

- **GIVEN** a target metric revision changed after preview
- **WHEN** apply is attempted
- **THEN** the batch is rejected with a version conflict and the draft remains available

#### Scenario: Selector changes from import energy to active power
<!-- scenario-id: M2-R9-S04 -->

- **GIVEN** preview binds `measurements.importEnergy` as a cumulative source
- **WHEN** apply changes the selector to `measurements.activePower` without obtaining a new preview token
- **THEN** the server returns `409 PREVIEW_MISMATCH` and writes no source, mapping, profile, baseline, or history row

#### Scenario: Target or measurement semantics change
<!-- scenario-id: M2-R9-S05 -->

- **GIVEN** preview binds one reviewed target with cumulative-energy semantics, an `energyFlowRole`, unit, scaling, and `sourceTimestampTimeZone`
- **WHEN** apply changes the target or any measurement semantic while reusing the token
- **THEN** the server returns `409 PREVIEW_MISMATCH` and requires a new preview before any write

#### Scenario: Selected items or optional E6 mutation change
<!-- scenario-id: M2-R9-S06 -->

- **GIVEN** the preview contains a selected item set and an optional reviewed E6 profile mutation
- **WHEN** apply removes or adds a selected row, or changes that optional mutation, without a new preview
- **THEN** the server returns `409 PREVIEW_MISMATCH` with zero writes and preserves the draft for review

#### Scenario: Candidate or profile evidence revision changes
<!-- scenario-id: M2-R9-S07 -->

- **GIVEN** preview records source, profile, candidate, and sample revisions
- **WHEN** any recorded revision changes before the first apply commits
- **THEN** the server returns `409 PREVIEW_STALE`, performs no mutation, and requires refreshed evidence and a new preview

#### Scenario: Preview token expires
<!-- scenario-id: M2-R9-S08 -->

- **GIVEN** a preview token is past its server-defined expiry
- **WHEN** apply is requested for that token before any matching idempotency record exists
- **THEN** the server returns `409 PREVIEW_STALE` with zero writes and requires a new preview

#### Scenario: Same idempotency key carries a changed payload
<!-- scenario-id: M2-R9-S09 -->

- **GIVEN** an idempotency key was committed with one token and canonical draft, including cases where that token has since expired or its recorded revisions have advanced
- **WHEN** the same key is submitted with a different token or any changed canonical draft field
- **THEN** the server returns `409 IDEMPOTENCY_CONFLICT` and performs no additional write

---
### Requirement: Meters and accounting profiles have one authoritative binding path
<!-- requirement-id: M2-R10 -->

Committed mappings SHALL resolve to stable E1 source references consumable by the E6 site profile. The source workflow SHALL allow selecting an existing destination tag or generating a new named meter without hand-entering a metric key. When opened inside U6 it SHALL return draft references or explicitly saved-source references without independently activating an unreviewed denominator. The final review SHALL disclose any source writes separately from page publishing and SHALL never ask for the same MQTT mapping again in a display card. A standalone source apply SHALL bind a related profile baseline or explicitly show an unconfigured baseline; it SHALL not silently become the site total or a department denominator and SHALL not duplicate E6 accounting ownership in E1.

#### Scenario: Batch feeds department setup
<!-- scenario-id: M2-R10-S01 -->

- **GIVEN** new KN MAIN and STAMP source drafts are reviewed within U6
- **WHEN** the complete profile is applied
- **THEN** one reviewed transaction establishes source references and the selected profile changes, with no second display-local denominator

#### Scenario: Standalone source creation
<!-- scenario-id: M2-R10-S02 -->

- **GIVEN** a source is added without an accounting task
- **WHEN** source apply succeeds
- **THEN** it is available to the site picker but is not silently made the whole-site total or a department denominator

---
### Requirement: Ownership scope and physical-identity conflicts are blocking errors
<!-- requirement-id: M2-R11 -->

The server SHALL validate concrete site, reserved managed identities, existing destination identities and physical source claims on every preview and apply. A mapping SHALL not merge different meters into one destination because topic or labels match. Legitimate distinct measurements from one physical device MAY coexist, but duplicate cumulative registers SHALL not be counted as separate physical meters in E6. The UI SHALL provide row-level correction and preserve all unaffected selections.

Guided MQTT writes SHALL use the same authoritative ownership rules as other source-management writes. Solar-managed destinations, registered derived-metric destinations whose identities remain reserved even while disabled, and server-owned period-energy destinations SHALL NOT be acquired by a generic guided mapping. Ownership conflicts SHALL return a stable conflict code and HTTP 409 at both preview and apply. Apply SHALL evaluate current ownership again even when a previously issued preview token is otherwise valid. Rejection SHALL leave source definitions, mappings, source-change audit records, apply receipts and production subscriptions unchanged; a rejected preview SHALL NOT issue a usable token.

The 409 status SHALL identify a contest with the destination's actual owner and SHALL NOT be extended to other rejections. A preview rejected for the shape or internal consistency of its own draft SHALL retain the unprocessable-entity status it reports outside an ownership contest, so an operator is told to correct the draft rather than to choose a different destination. The set of ownership conflict codes SHALL have one authoritative definition that routes read rather than restate.

#### Scenario: Wrong site candidate
<!-- scenario-id: M2-R11-S01 -->

- **GIVEN** a CL-owned source is selected in KN setup
- **WHEN** the batch is reviewed
- **THEN** that row is blocked with a site correction or authorized review action instead of silently relabeling it

#### Scenario: Existing managed metric
<!-- scenario-id: M2-R11-S02 -->

- **GIVEN** a candidate proposes a destination managed by Solar or derived-metric ownership
- **WHEN** apply is requested
- **THEN** the conflict is blocked and offers the existing compatible source rather than overwriting ownership

#### Scenario: A malformed draft is not reported as an ownership contest

- **GIVEN** a preview draft whose topic contains a wildcard character, so it cannot be reviewed at all
- **WHEN** an authorized operator previews it
- **THEN** the response is unprocessable-entity with `SOURCE_REVIEW_REQUIRED`, not the ownership-conflict status

#### Scenario: An internally inconsistent draft keeps its own status

- **GIVEN** a preview draft whose declared scaling is not a positive decimal
- **WHEN** an authorized operator previews it
- **THEN** the response is unprocessable-entity with `PREVIEW_DRAFT_MISMATCH`, and no preview token is issued

#### Scenario: An ownership contest still answers with the conflict status

- **WHEN** an authorized operator previews a generic source for a destination the Solar adapter or an enabled derived metric already owns
- **THEN** the response is the ownership conflict status with its stable code, and no usable preview token exists


<!-- @trace
source: fix-guided-preview-rejection-status
updated: 2026-09-08
code:
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/server/src/services/periodConsumptionService.ts
  - apps/server/src/services/metricDestinationOwnershipService.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/services/api.ts
  - apps/server/src/services/profileReadinessService.ts
  - apps/server/src/routes/metrics-history.ts
  - packages/shared/src/periodConsumption.ts
  - apps/server/src/services/departmentSharesService.ts
  - apps/server/src/routes/site-energy-profiles.ts
tests:
  - apps/server/src/services/departmentSharesService.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - packages/shared/src/periodConsumption.test.ts
  - apps/server/src/services/energyAuthoringJourney.test.ts
  - apps/server/src/services/periodConsumptionService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/mqtt-guided-activation.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
-->

---
### Requirement: Schema drift and source replacement preserve accounting continuity
<!-- requirement-id: M2-R12 -->

Bindings SHALL be tied to explicit selectors and schema compatibility, not a moving latest-sample index. Missing fields, ambiguous tags, incompatible unit/type changes and conflicting physical identifiers SHALL mark only the affected source as needs-review while retaining its last accepted timestamp. The system SHALL not auto-rebind to a nearby numeric field. Transport path changes for the same reviewed meter MAY preserve identity through an explicit source revision; a replacement physical meter SHALL use the E1 epoch workflow and SHALL not subtract across the replacement.

#### Scenario: Value field disappears
<!-- scenario-id: M2-R12-S01 -->

- **GIVEN** an active meter changes energy to energyRaw with no approved migration
- **WHEN** the next packet arrives
- **THEN** the source shows needs-review; no other number is substituted and its last accepted reading is not marked fresh

#### Scenario: Physical meter is replaced
<!-- scenario-id: M2-R12-S02 -->

- **GIVEN** a different device takes the same topic and tag
- **WHEN** an operator confirms replacement
- **THEN** a new epoch and explicit review are required; no negative delta or fake rollover bridges the devices

---
### Requirement: Legacy mapping edits cannot erase new selectors
<!-- requirement-id: M2-R13 -->

The migration SHALL preserve existing generic mappings, ownership and precision settings. New selector-aware bindings SHALL not be serialized through a legacy whole-list PUT that drops selector or source-revision fields. Legacy endpoints SHALL use a preservation-aware adapter or reject unsupported edits clearly while allowing unrelated legacy sources to remain manageable. Old scalar and supported path mappings SHALL retain their existing behavior until explicitly reviewed; no automatic tag heuristics shall change production values during rollout.

#### Scenario: Old screen saves another mapping
<!-- scenario-id: M2-R13-S01 -->

- **GIVEN** a selector-aware KN binding exists and a legacy screen edits an unrelated CL mapping
- **WHEN** the legacy save is received
- **THEN** the KN selector, identity and revision remain unchanged or the unsafe save is rejected before any mutation

#### Scenario: Upgrade existing scalar source
<!-- scenario-id: M2-R13-S02 -->

- **GIVEN** an old scalar mapping receives valid values
- **WHEN** the new feature is enabled
- **THEN** its operation is preserved and a guided review can reuse its identity without recreating or double-ingesting it

---
### Requirement: Task completion is validated without manuals or external clients
<!-- requirement-id: M2-R14 -->

Acceptance SHALL include at least three representative operators unfamiliar with the system using preauthorized synthetic sources without a manual, terminal, external MQTT client, or coaching. They SHALL complete KN batch source setup, change one source, recover a missing-field case and return to the denominator/department task within the defined UI stages. Measurements SHALL record completion, help requests, screen transitions, wrong-site selections and recovery. Failed unassisted trials SHALL require product fixes and retesting, not replacement by documentation. State labels SHALL distinguish configured, subscribed, observed, parsed and period-baseline-ready.

#### Scenario: Unassisted batch task
<!-- scenario-id: M2-R14-S01 -->

- **GIVEN** an operator is given an authorized broker fixture with twenty mixed candidates
- **WHEN** they configure the intended KN cumulative sources and target roles
- **THEN** they use the product UI only, do not type selectors or metric IDs, reject incompatible power rows and complete the reviewed profile without assistance

#### Scenario: Extraction failure recovery
<!-- scenario-id: M2-R14-S02 -->

- **GIVEN** a selected source no longer has a valid value field
- **WHEN** the operator follows its inline issue action
- **THEN** they repair or reselect in the same task with unrelated rows preserved; if coaching is necessary the usability gate fails

---
### Requirement: Guided mapping completion includes observable runtime activation

The management mapping apply operation SHALL distinguish an atomically saved source/mapping from a broker-acknowledged runtime subscription and from an observed measurement. A newly saved exact topic SHALL be reconciled with production subscription ownership without requiring a server restart or manual reload. An activation failure SHALL preserve the committed configuration and offer retry without duplicating source revisions or changing unrelated subscriptions.

#### Scenario: R1 new topic activates without restart
- **WHEN** an authorized operator applies a reviewed mapping for a topic not covered by any current production subscription and the broker grants its subscription
- **THEN** production reception becomes active without restart, the response identifies saved and activated states, and a subsequent production packet reaches the selected source
- **AND** preview samples are not replayed into accepted history

#### Scenario: R1 retry after broker refusal
- **WHEN** the configuration commits but the broker refuses subscription, and the operator retries the same saved operation after recovery
- **THEN** the first result reports saved but not active, the retry attempts activation again, and only one source/mapping mutation and idempotency receipt exist


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
### Requirement: Reviewed power mappings retain selector semantics in production

Reviewed selector semantics SHALL apply to both power-gauge and energy sources. A source's measurement kind SHALL determine its output unit and destination, not whether its selector is honored. Power-gauge readings SHALL NOT be admitted as cumulative-energy readings or used as period baselines.

#### Scenario: R2 select one power tag from an array
- **WHEN** a power-gauge mapping selects tag P1 and field value from a packet containing P1=12.5 and P2=99
- **THEN** preview and production both resolve P1=12.5 with the reviewed power unit and scaling, rather than reading P2 or failing through a scalar-only parser
- **AND** accepted energy history remains unchanged

#### Scenario: R2 ambiguous or missing power tag
- **WHEN** a packet has no matching P1 record or multiple indistinguishable P1 records
- **THEN** the mapping reports a selector error, preserves its last valid value with honest freshness, and does not substitute another record or zero

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
### Requirement: Guided source and mapping enabled states are saved consistently
<!-- requirement-id: M2-R15 -->

A guided mapping operation SHALL atomically persist the reviewed source and corresponding mapping with matching enabled states, including creation, disable and re-enable operations. Non-identity enabled-state changes SHALL retain the existing source revision and selector unless the reviewed draft explicitly changes them under the existing revision rules. A disabled result SHALL NOT be presented as an active measurement solely because another source subscribes to the same topic. Subscription reconciliation SHALL preserve other owners of shared topics. Retrying the same operation SHALL NOT add source revisions or duplicate apply receipts.

#### Scenario: N2 re-enable an existing reviewed source
<!-- scenario-id: M2-R15-S01 -->

- **GIVEN** an existing source and its mapping are both disabled
- **WHEN** a reviewed guided apply re-enables the source without changing its identity, topic or selector
- **THEN** both source and mapping are enabled in the same committed result, the revision and selector are preserved, and a subsequent eligible production packet can reach that source after successful runtime activation

#### Scenario: N2 create a disabled source
<!-- scenario-id: M2-R15-S02 -->

- **WHEN** a reviewed guided apply creates a source whose enabled state is false
- **THEN** its mapping is also disabled, it does not initiate activation on its own behalf, and no accepted reading is claimed for the new source

#### Scenario: N2 disable one owner of a shared topic
<!-- scenario-id: M2-R15-S03 -->

- **GIVEN** two mappings use the same production topic
- **WHEN** one source is disabled through guided apply
- **THEN** that source and its mapping are disabled together while the other source remains operational and its subscription is preserved

#### Scenario: N2 failure rolls back both sides
<!-- scenario-id: M2-R15-S04 -->

- **WHEN** a mapping write fails during an enabled-state change
- **THEN** neither the source nor mapping changes state, no successful apply receipt or source-change audit record is left behind, and no runtime activation is attempted

#### Scenario: N2 retry reuses the committed configuration
<!-- scenario-id: M2-R15-S05 -->

- **WHEN** the same re-enable apply is retried after a lost response or broker refusal
- **THEN** the committed source and enabled mapping remain consistent, only one source mutation and receipt exist, and retryable runtime activation retains its existing semantics

<!-- @trace
source: fix-guided-mqtt-write-integrity
updated: 2026-09-08
code:
  - docs/reviews/2026-09-08-energy-authoring-followup-review.md
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/metricDestinationOwnershipService.ts
  - apps/server/src/services/guidedMappingActivationService.ts
  - apps/web/src/pages/DataHub/GuidedMqttMappingPanel.tsx
  - packages/shared/src/guidedMqttMapping.ts
  - apps/server/src/services/guidedMqttMappingService.ts
  - apps/server/src/routes/site-energy-profiles.ts
tests:
  - apps/server/src/services/mqttMeterIngest.test.ts
  - apps/server/src/routes/mqtt-guided-activation.test.ts
  - apps/server/src/services/energyAuthoringJourney.test.ts
  - apps/server/src/services/guidedMqttMappingService.test.ts
-->

---
### Requirement: Destructive guided source changes obey current dependency protection

For a first guided apply that disables a currently enabled source or changes an existing source's destination metric key, the server SHALL evaluate the current dependencies of the persisted source's original destination in its concrete site. Guided apply and direct source management SHALL use the same dependency-blocking decision. A client-provided acknowledgement or preview token SHALL NOT substitute for resolving current dependencies.

An unresolved draft, live-page or derived-metric dependency SHALL reject apply with HTTP 409 and `E1_SOURCE_IN_USE`. An unknown impact SHALL reject apply with HTTP 409 and `E1_SOURCE_IMPACT_UNKNOWN`. The caller SHALL be able to inspect the dependencies through the existing source-impact read surface. The rejected apply SHALL leave source definitions, mappings, source audit records, apply receipts, page/profile configuration, energy history and production subscription state unchanged.

The check SHALL use the state at commit time, including dependencies introduced after preview. It SHALL NOT redefine preview status classification: destination ownership conflicts retain their existing 409 behavior and malformed draft previews retain their existing 422 behavior. This dependency requirement applies to first mutations, not to replaying an already committed identical request; existing idempotency and ownership rechecks SHALL remain in force.

#### Scenario: F1 a referenced source cannot be disabled through guided apply

- **GIVEN** an enabled KN source is referenced by an Overview draft and the existing impact read reports that mutation is blocked
- **WHEN** an authorized operator submits a valid new preview token and exact canonical draft that disables that source
- **THEN** apply returns HTTP 409 with `E1_SOURCE_IN_USE`, the source and mapping remain enabled, and no audit, receipt or subscription change is made
- **AND** the existing source-impact read continues to identify the blocking draft

#### Scenario: An in-use source cannot evade the guard by changing its metric key

- **GIVEN** the original destination of an existing source is referenced by a live page or a derived metric
- **WHEN** an otherwise valid guided source revision changes that destination to a currently free metric key
- **THEN** apply evaluates the original destination and rejects with `E1_SOURCE_IN_USE` without creating the replacement mapping or changing the original source

#### Scenario: A dependency introduced after preview still blocks apply

- **GIVEN** a disabling draft was previewed while its source had no consumers
- **WHEN** a dependent draft is saved before the first apply commits
- **THEN** apply rejects with `E1_SOURCE_IN_USE` even though the mapping and source revisions have not changed

#### Scenario: Failed dependency lookup is not an empty dependency set

- **WHEN** current source impact cannot be established during an otherwise valid destructive guided apply
- **THEN** apply returns HTTP 409 with `E1_SOURCE_IMPACT_UNKNOWN` and performs no source, mapping, audit, receipt or runtime mutation

#### Scenario: Non-destructive and unused-source operations remain available

- **WHEN** an authorized request creates a new unowned source, re-enables a source, updates only a display name, or disables an unused source with known empty impact
- **THEN** this dependency guard does not reject the request, and all existing ownership, source revision, token and activation rules still apply

#### Scenario: A rejected apply never reaches runtime activation

- **GIVEN** a valid destructive request targets a source with an unresolved consumer
- **WHEN** the management apply endpoint processes the request
- **THEN** the returned error uses the existing failure envelope and no subscription reconciliation is invoked

#### Scenario: An identical committed request remains a replay rather than a new mutation

- **GIVEN** a request was committed successfully, the same idempotency key and canonical request are submitted again, and current destination ownership still permits the existing replay contract
- **WHEN** the response is replayed after other consumers have been added
- **THEN** the original committed write result is returned without new source, mapping or audit writes, while existing runtime activation and ownership safeguards remain unchanged

<!-- @trace
source: fix-guided-source-mutation-guards
updated: 2026-09-09
code:
  - apps/server/src/mqtt/mqttPowerIngest.test-support.ts
  - apps/server/src/services/guidedMqttMappingService.ts
  - docs/reviews/2026-09-08-mqtt-runtime-safety-review.md
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/mqtt/reviewedPowerObservationOrdering.ts
  - apps/server/src/services/sourceImpactService.ts
  - apps/server/src/routes/meter-sources.ts
tests:
  - apps/server/src/routes/mqtt-guided-activation.test.ts
  - apps/server/src/mqtt/mqttReviewedPowerOrdering.test.ts
  - apps/server/src/services/guidedMqttMappingService.test.ts
  - apps/server/src/mqtt/mqttPowerSelectorIngest.test.ts
-->

---
### Requirement: Guided power reception uses source-bound production evidence

The guided reception result SHALL distinguish energy-history evidence from reviewed power reception evidence while preserving its existing `observed` and `lastAcceptedAt` fields. For a reviewed power source, a valid production packet that passes admission and the existing observation-ordering rules and commits a live update SHALL establish reception evidence for that exact source. Subsequent guided apply or identical-request replay in the same runtime lifetime SHALL be able to report that evidence without creating another source revision or replaying a packet.

Power reception evidence SHALL identify the metric scope, destination key, physical meter, channel, source revision and epoch that admitted the update. It SHALL NOT be inferred solely from a populated generic live destination, a subscription acknowledgement, preview output or another source's observation. `lastAcceptedAt` SHALL describe actual receipt time, not silently substitute the source observation timestamp. Existing energy reception SHALL continue to use admitted energy readings for the requested source identity.

#### Scenario: A received power value is observable through guided replay
- **GIVEN** a reviewed power mapping has been saved and a subsequent production packet commits a valid 12.5 kW live update
- **WHEN** the same source is inspected through an identical guided apply replay in that runtime
- **THEN** reception reports `observed=true` with its actual receipt time, the source is not saved a second time, and no accepted energy reading or baseline is created

#### Scenario: Receipt time is distinct from source observation time
- **GIVEN** a valid power packet's source observation time differs from its arrival time
- **WHEN** it commits a live update and guided reception is read
- **THEN** the live metric retains its correct observation time while `lastAcceptedAt` identifies the actual packet receipt time

#### Scenario: Subscription and preview are not received measurements
- **WHEN** a reviewed power source has only preview output or broker subscription acknowledgement and no qualifying production live update
- **THEN** reception remains `observed=false` and `lastAcceptedAt=null`

#### Scenario: A generic old live value cannot prove a new source
- **GIVEN** a destination contains a live value from an earlier source revision, epoch, physical meter or unreviewed mapping
- **WHEN** a different reviewed source now owns that destination but has no qualifying production update
- **THEN** the old value does not establish reception for the new source, even if its unit and metric key match

#### Scenario: Rejected and non-updating packets do not fabricate evidence
- **WHEN** preview, invalid admission, a transaction failure, or a power observation rejected as late or conflicting produces no committed live update
- **THEN** it creates no new reception evidence and does not advance an existing `lastAcceptedAt`; an identical no-op observation also does not manufacture a new committed update

#### Scenario: Source and site evidence stay isolated
- **WHEN** one reviewed power source commits a live update
- **THEN** only its full source identity is reported as observed, not a same-named destination in another site or another source revision


<!-- @trace
source: fix-reviewed-power-reception-evidence
updated: 2026-09-09
code:
  - apps/server/src/mqtt/powerReceptionEvidence.ts
  - apps/server/src/services/sourceImpactService.ts
  - apps/server/src/routes/meter-sources.ts
  - apps/server/src/services/guidedMappingActivationService.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/routes/site-energy-profiles.ts
  - docs/reviews/2026-09-09-source-runtime-followup-review.md
  - apps/server/src/services/mqttMeterIngest.ts
tests:
  - apps/server/src/services/sourceImpactService.test.ts
  - apps/server/src/services/mqttMeterIngest.test.ts
  - apps/server/src/mqtt/powerReceptionEvidence.test.ts
  - apps/server/src/routes/meter-sources.test.ts
  - apps/server/src/routes/mqtt-power-reception.test.ts
  - apps/server/src/routes/meter-sources-runtime-reconciliation.test.ts
  - apps/server/src/routes/source-impact-mutation.test.ts
-->

---
### Requirement: Power reception remains bounded and separate from energy history

Power reception introduced by this change SHALL describe evidence available within the current receiving-service lifetime, not a durable power history. After replacement of that service or a server restart, the system SHALL conservatively report no power reception evidence until a new qualifying live update arrives. Reconnecting the same service SHALL NOT turn subscription acknowledgement into a new received measurement. Evidence storage SHALL be bounded by source identities rather than by packet count or an ever-growing revision history.

This change SHALL NOT add power observations to accepted energy history, energy quarantine or meter baselines, change power ordering, or change energy reception persistence. It SHALL preserve the existing guided response shape and SHALL NOT add a public API or database schema requirement.

#### Scenario: Restart does not borrow old destination state
- **GIVEN** a prior server instance committed a power live value
- **WHEN** a new receiving service starts before it has committed a qualifying update for that source
- **THEN** reception is conservatively false despite the stored generic live value, and becomes true after a qualifying current-service update

#### Scenario: Repeated packets do not grow an observation log
- **WHEN** many valid updates arrive for the same source during one runtime lifetime
- **THEN** reception retains bounded latest-source evidence rather than a packet history, and the energy history, quarantine and baseline tables remain unchanged by those power packets

#### Scenario: Energy reception stays persistent
- **GIVEN** a cumulative-energy source has an admitted reading for its exact source identity
- **WHEN** guided reception is read before or after a receiving-service restart
- **THEN** its existing persisted energy evidence remains observable independently of the power-evidence lifecycle

<!-- @trace
source: fix-reviewed-power-reception-evidence
updated: 2026-09-09
code:
  - apps/server/src/mqtt/powerReceptionEvidence.ts
  - apps/server/src/services/sourceImpactService.ts
  - apps/server/src/routes/meter-sources.ts
  - apps/server/src/services/guidedMappingActivationService.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/routes/site-energy-profiles.ts
  - docs/reviews/2026-09-09-source-runtime-followup-review.md
  - apps/server/src/services/mqttMeterIngest.ts
tests:
  - apps/server/src/services/sourceImpactService.test.ts
  - apps/server/src/services/mqttMeterIngest.test.ts
  - apps/server/src/mqtt/powerReceptionEvidence.test.ts
  - apps/server/src/routes/meter-sources.test.ts
  - apps/server/src/routes/mqtt-power-reception.test.ts
  - apps/server/src/routes/meter-sources-runtime-reconciliation.test.ts
  - apps/server/src/routes/source-impact-mutation.test.ts
-->