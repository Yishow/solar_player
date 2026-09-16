## Purpose

Define the physical power acquisition, versioned topic namespaces, publisher identity isolation, exact decimal precision, and cutover contracts for upstream bridge publishers.

## ADDED Requirements

Applicability: PMQ requirements govern the explicitly selected physical/raw bridge profile, including CL candidates. They do not require KN engineering results to publish raw meters, use DDE, use opc/v1, suppress report replay, or enter E1. Authoritative engineering results follow KNE/EPR; the receiver/upstream ownership protections still apply to both.

### Requirement: Power acquisition remains upstream and independently operated
<!-- requirement-id: PMQ-R1 -->

The system SHALL preserve solar server to solar_mqtt_go to MQTT to Player managed ingestion, and power server to opc_mqtt to MQTT to Player reviewed power ingestion. The current opc_mqtt acquisition mode SHALL be described as InTouch DDE, not OPC UA or an active OPC DA connection. Existing DDE operation SHALL require the VIEW.exe interactive login session and SHALL NOT be deployed as a Session 0 Windows Service. Player SHALL NOT acquire directly from DDE or reconfigure upstream publishers through its receiver settings.

#### Scenario: DDE process placement
<!-- scenario-id: PMQ-R1-S01 -->

- **GIVEN** the approved source is InTouch VIEW.exe in an interactive session
- **WHEN** the bridge deployment is prepared
- **THEN** same-user same-session startup is required and unsupported service-mode startup is blocked

#### Scenario: Optional KN physical source technology not established
<!-- scenario-id: PMQ-R1-S02 -->

- **GIVEN** an optional KN physical/raw deployment has no confirmed acquisition interface
- **WHEN** that optional physical deployment is prepared
- **THEN** DDE is conditional on verified availability; no invented OPC Item, NodeId or remote connection is activated

#### Scenario: No implicit upstream migration
<!-- scenario-id: PMQ-R1-S03 -->

- **GIVEN** Player receiver broker settings change
- **WHEN** the update completes
- **THEN** both publishers and broker daemon settings remain unchanged and reception readiness is independently checked

### Requirement: Versioned power topics and publisher identities prevent cross-site collisions
<!-- requirement-id: PMQ-R2 -->

The proposed opc-power-v1 family SHALL use opc/v1/{site}/raw/{tagId}, opc/v1/{site}/virtual/{virtualId}, and separately registered diagnostic topics for site cl or kn. Publisher ID, configured site, topic identity and payload identity SHALL agree with an approved registry. Every concurrent publisher SHALL have a distinct deployment-stable MQTT Client ID; one active owner SHALL publish a given site/tag topic. Registry labels SHALL NOT determine physical identity. Saved publisher connection settings SHALL be distinguished from active connection settings; until a verified reconnect is implemented, connection-affecting changes SHALL explicitly require a controlled restart and SHALL NOT be reported as applied. MQTT topic case SHALL remain exact; Solar CL/KN SHALL not be rewritten into lowercase topics. Legacy opc/raw/{id} and opc/{name} SHALL keep their meaning until explicit migration.

#### Scenario: Two sites online
<!-- scenario-id: PMQ-R2-S01 -->

- **GIVEN** CL and KN publisher instances connect to one broker
- **WHEN** they publish matching tag labels
- **THEN** their Client IDs and topics remain distinct and neither session displaces the other

#### Scenario: Conflicting publisher owner
<!-- scenario-id: PMQ-R2-S02 -->

- **GIVEN** two instances claim the same registered site/tag owner
- **WHEN** a second stream attempts admission
- **THEN** the conflict is diagnosed and a second canonical writer is not created

#### Scenario: Site or tag mismatch
<!-- scenario-id: PMQ-R2-S03 -->

- **GIVEN** a payload site or tag differs from its registered exact topic
- **WHEN** Player validates the packet
- **THEN** it is rejected before mapping or accepted-state mutation

### Requirement: Power values preserve original precision and distinguish all clocks
<!-- requirement-id: PMQ-R3 -->

V1 readings SHALL preserve original decimal lexemes before float conversion or display rounding. Each successful point acquisition SHALL retain readAt, optional trustworthy sourceTimestamp, sourceQuality and readStatus independently from publishedAt and Player receivedAt. Timestamps SHALL use explicit offsets or Z. Current legacy ts SHALL be treated as publication time. Successful DDE numeric access alone SHALL NOT establish source event time or good device quality. Source-required SHALL remain the E1 default; missing source time MAY use only the existing explicitly audited allow-receive-time-estimate policy with actual permitted transport evidence, keeping sourceTimestamp null. Read time or publish time SHALL NOT be substituted as trustworthy source time.

#### Scenario: Exact counter increment
<!-- scenario-id: PMQ-R3-S01 -->

- **GIVEN** DDE text values are 9007199254740992.000 and 9007199254740992.125
- **WHEN** v1 encodes and Player normalizes them
- **THEN** the original lexemes survive and the decimal increment is exactly 0.125 without float rounding

#### Scenario: No source timestamp
<!-- scenario-id: PMQ-R3-S02 -->

- **GIVEN** DDE returned a value but no device event timestamp
- **WHEN** a source-required binding receives it
- **THEN** the value is diagnostic-only or quarantined; the UI does not silently select legacy ts or publishedAt as source time

#### Scenario: Explicit estimate approval
<!-- scenario-id: PMQ-R3-S03 -->

- **GIVEN** a timestamp-free source revision was explicitly approved for receive-time estimates
- **WHEN** a fresh production packet has retain=false, dup=false and qos=1
- **THEN** E1 may use original Player receivedAt with receive-time-estimated quality and null sourceTimestamp, not an exact calendar-boundary claim

#### Scenario: Unknown device quality
<!-- scenario-id: PMQ-R3-S04 -->

- **GIVEN** a DDE request succeeded without device-quality metadata
- **WHEN** the sample is reviewed
- **THEN** read success and unknown source quality are both shown, and any use requires explicit limitation review without weakening E1 transport/time gates

### Requirement: Failed or replayed acquisitions cannot become new healthy measurements
<!-- requirement-id: PMQ-R4 -->

Each actual acquisition SHALL generate a stable sampleId reused on retransmission with original acquisition evidence. Player SHALL perform bounded durable deduplication for registered site/publisher/tag/sampleId before E1 admission and retain deduplication state for at least the allowed replay interval; expired observations SHALL be rejected after records expire. Equal values from distinct real acquisitions SHALL NOT be deduplicated solely by value. Reuse of the same sample identity with different value or acquisition evidence SHALL be quarantined as a conflict rather than silently ignored. Failed reads, stale caches, nonfinite data and unavailable items SHALL NOT be published as valid zero or re-timestamped healthy readings. This physical live path SHALL not backfill buffered outage data on reconnect; this restriction SHALL NOT prohibit the bounded engineering-report replay defined in EPR-R5. Timeouts SHALL remain unknown outcomes, and bounded publish acknowledgements SHALL not imply receiver parsing or accepted readings.

#### Scenario: Same sample after restart
<!-- scenario-id: PMQ-R4-S01 -->

- **GIVEN** one acquisition has already been accepted
- **WHEN** the publisher or Player restarts and the same sample is delivered with dup=false
- **THEN** durable sample identity prevents a second accepted update or freshness refresh

#### Scenario: Real unchanged counter
<!-- scenario-id: PMQ-R4-S02 -->

- **GIVEN** two successful acquisitions have equal values but distinct sample IDs
- **WHEN** both are received normally
- **THEN** value equality alone does not suppress the second genuine observation

#### Scenario: Single point read failure
<!-- scenario-id: PMQ-R4-S03 -->

- **GIVEN** some DDE items succeed and one fails
- **WHEN** publishing runs
- **THEN** only fresh successful raw points can emit valid samples; the failed point reports unavailable without zero or stale-value refresh

#### Scenario: Publish timeout
<!-- scenario-id: PMQ-R4-S04 -->

- **GIVEN** an MQTT publish acknowledgement is not observed before its bound
- **WHEN** the bridge reports status
- **THEN** the result is unknown rather than confirmed delivered or definitely not sent; retransmission keeps sample identity

### Requirement: Virtual publication remains distinct from physical accounting
<!-- requirement-id: PMQ-R5 -->

Unreviewed comparison-only publisher virtual outputs under this physical profile SHALL carry their own stable ID, member tags and publisherConfigRevision, and SHALL be marked calculation-only rather than a physical cumulative meter. A formula SHALL have at least one member. Every required member SHALL be valid within the approved acquisition window; missing, failed, stale or dimensionally incompatible members SHALL invalidate the complete aggregate, not trigger a partial sum. Formula changes and physical counter resets SHALL NOT be differenced as a continuous aggregate counter. For this physical profile, formal period totals and department membership SHALL remain based on reviewed raw channels and existing E1/E2/E6 contracts. This restriction SHALL NOT exclude a registered authoritative engineering result following KNE/EPR. A main counter, feeder counters and their virtual representations SHALL NOT be summed together as independent consumption.

#### Scenario: Missing member
<!-- scenario-id: PMQ-R5-S01 -->

- **GIVEN** a department formula requires three raw counters and one is unavailable
- **WHEN** the calculation runs
- **THEN** the virtual result is invalid with a missing-member reason and no partial valid total is published

#### Scenario: Formula membership changed
<!-- scenario-id: PMQ-R5-S02 -->

- **GIVEN** a virtual sum gains a feeder
- **WHEN** a new value arrives
- **THEN** its publisher configuration revision changes and the discontinuity cannot become E1 consumption

#### Scenario: Main and child counters
<!-- scenario-id: PMQ-R5-S03 -->

- **GIVEN** main, feeders and their virtual total are visible
- **WHEN** an E6 accounting profile is reviewed
- **THEN** the boundary must be explicitly chosen and overlapping members or duplicate representations cannot silently inflate the total

### Requirement: V1 admission validates the envelope before reusing M2 and E1
<!-- requirement-id: PMQ-R6 -->

An explicitly registered opc-power-v1 protocol gate SHALL validate the envelope, registry revision, site/publisher/tag binding, measurement kind, unit, read status, sample identity and allowed age before generic extraction. Validation failure SHALL NOT fall through to a value-only generic parser. Preview and production SHALL use the same bounded gate; protocol selection and reviewed publisher/tag binding SHALL be included in server-normalized canonicalDraft and previewToken binding. Existing M2 selector extraction and E1/E2 semantics SHALL remain authoritative after validation. Missing implementation or unsupported schema SHALL block activation while permitting safe diagnostics. Production packets marked exampleOnly SHALL be rejected; offline fixtures SHALL never be replayed into accepted ingestion. A payload publisher ID SHALL not be represented as authenticated identity without independent evidence. Unreported source quality SHALL be blocked by default; allowing it requires an explicit per-source limitation approval bound to the protocol/source review revision and token, and SHALL NOT bypass E1 timing or transport admission.

#### Scenario: Value valid but envelope invalid
<!-- scenario-id: PMQ-R6-S01 -->

- **GIVEN** a packet has a valid numeric value but the wrong site or unsupported schema
- **WHEN** a mapping selects value
- **THEN** the protocol gate rejects it before generic fallback and accepted-state mutation

#### Scenario: Binding changes after preview
<!-- scenario-id: PMQ-R6-S02 -->

- **GIVEN** a preview approved one publisher/tag protocol binding
- **WHEN** apply changes that binding with the same token
- **THEN** the request is rejected with zero domain writes and requires another preview

#### Scenario: Protocol support unavailable
<!-- scenario-id: PMQ-R6-S03 -->

- **GIVEN** the v1 gate has not been implemented or enabled
- **WHEN** the UI sees a v1 example
- **THEN** it labels unsupported activation rather than treating $.value as full compatibility

### Requirement: Retained diagnostics and live power delivery stay separate
<!-- requirement-id: PMQ-R7 -->

New v1 raw and virtual publications SHALL use QoS 1 and retain=false by default, with actual transport flags preserved through Player. Retained optional snapshot and status topics SHALL be diagnostic-only and SHALL NOT be admitted as physical measurements. Retained old power messages without trustworthy source time SHALL follow existing E1 rejection, not be replayed on apply. This change SHALL NOT prohibit valid retained Solar managed summaries with original timestamps or change existing Solar publishing semantics. Heartbeat or last publish success SHALL not refresh measurement freshness.

#### Scenario: Retained snapshot
<!-- scenario-id: PMQ-R7-S01 -->

- **GIVEN** a new subscriber receives an optional retained power snapshot
- **WHEN** it is inspected
- **THEN** the retained last-known data is diagnostic-only and does not initialize period baselines

#### Scenario: Existing Solar retained summary
<!-- scenario-id: PMQ-R7-S02 -->

- **GIVEN** a standard solar retained summary has valid original source time
- **WHEN** Player reconnects
- **THEN** the existing managed adapter remains authoritative and freshness stays based on original time

#### Scenario: Heartbeat without data
<!-- scenario-id: PMQ-R7-S03 -->

- **GIVEN** publisher heartbeat continues but DDE readings stopped
- **WHEN** the UI refreshes
- **THEN** publisher liveness stays separate while the affected measurements become stale or unavailable

### Requirement: Power migration is additive and preserves one reviewed accepted path
<!-- requirement-id: PMQ-R8 -->

Migration SHALL inventory and preserve legacy topics, labels, unit/scaling metadata and consumers, add v1 in isolated or shadow mode, and enable one reviewed canonical binding per physical channel only after parity review. Publisher versioning SHALL be negotiated independently of Player source revisions and epochs. Legacy/v1 dual publication SHALL not imply dual accepted ingestion. Cutover SHALL preserve history and require existing continuity review for source changes. Rollback SHALL disable new routing safely without deleting history, clearing retained production data or restoring blind full-list writes. Starting a second site SHALL not reuse another site physical IDs, registry approval or formulas.

#### Scenario: Parallel verification
<!-- scenario-id: PMQ-R8-S01 -->

- **GIVEN** legacy and v1 are emitted for comparison
- **WHEN** shadow verification runs
- **THEN** only one path may write accepted history; the other is diagnostic comparison

#### Scenario: Reviewed cutover
<!-- scenario-id: PMQ-R8-S02 -->

- **GIVEN** raw source continuity and consumers have been reviewed
- **WHEN** v1 becomes canonical
- **THEN** old admission is disabled under a guarded cutover and history is not reset or double counted

#### Scenario: Rollback
<!-- scenario-id: PMQ-R8-S03 -->

- **GIVEN** the new protocol fails validation
- **WHEN** the operator rolls back according to the approved plan
- **THEN** v1 admission stops, preserved history and managed Solar subscriptions remain, and legacy admission resumes only through the reviewed single-writer configuration
