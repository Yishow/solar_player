# meter-reading-contracts Specification

## Purpose

TBD - created by archiving change 'add-meter-reading-contracts'. Update Purpose after archive.

## Requirements

### Requirement: Typed source semantics and physical meter identity
<!-- requirement-id: E1-R1 -->

The ingestion service SHALL require a versioned measurement kind, unit, meter identity and concrete site for every energy source admitted to period calculation. Power gauges, cumulative counters and interval energy SHALL remain distinguishable. Each source SHALL declare energyFlowRole as consumption, generation, grid-import or grid-export rather than using a common key prefix. E1 SHALL store physical identity and measurement semantics only; siteTotal, department membership and shareBasis SHALL belong exclusively to the E6 profile. E1 source writes containing meterRole(site-main/department) or departmentId SHALL fail with field-specific validation errors instead of persisting a second accounting authority.

#### Scenario: Separate power from energy
<!-- scenario-id: E1-R1-S01 -->

- **GIVEN** a CL main meter reports cumulative-energy in kWh and an inverter reports power-gauge in kW
- **WHEN** both readings arrive
- **THEN** only the main meter enters consumption-counter processing; the inverter is not summed into consumption

#### Scenario: Unknown legacy mapping
<!-- scenario-id: E1-R1-S02 -->

- **GIVEN** an existing factory mapping has no verified measurement kind
- **WHEN** migration inventories the mapping
- **THEN** the original setting is preserved, its status is needs-review, and period calculation cannot use it

#### Scenario: Accounting assignment does not redefine a source
<!-- scenario-id: E1-R1-S03 -->

- **GIVEN** a reviewed consumption channel is selected for a department in E6
- **WHEN** the operator reassigns it as siteTotal through a valid E6 profile review
- **THEN** only the E6 profile revision changes; the E1 source revision, epoch and baseline remain unchanged and no department or site-main identity is stored on the source

#### Scenario: Reject accounting fields on a source
<!-- scenario-id: E1-R1-S04 -->

- **GIVEN** a source draft contains meterRole=site-main or departmentId=stamping
- **WHEN** E1 source validation runs
- **THEN** the write fails with the offending field identified and no source or profile is changed

---
### Requirement: Immutable samples and idempotent ingestion
<!-- requirement-id: E1-R2 -->

The server SHALL persist original and normalized decimal values with source and receive timestamps, site, meter, channel, revision, epoch, quality and origin/retain/dup/qos evidence. Repeated transport deliveries SHALL NOT create additional accepted energy observations. Conflicting readings with the same identity and source timestamp SHALL be quarantined. Before deduplication, counter-continuity checks or any accepted-state mutation, a production MQTT packet with retain=true and no trustworthy sourceTimestamp SHALL return quarantined with RETAINED_SOURCE_TIME_UNKNOWN and actual age unknown. It SHALL NOT update accepted history, live values, lastAcceptedAt, freshness, baseline or epoch, nor emit meter-readings-changed or create a counter discontinuity. This admission gate SHALL work after restart without relying on an in-memory replay cache. A trustworthy sourceTimestamp SHALL be a validated source observation instant, never receivedAt or a receive-time estimate. Retained packets with trustworthy source time SHALL use that time for deduplication and freshness, not their replay receive time.

Timestamp parsing SHALL be side-effect free. If a retained packet has an invalid source timestamp, its primary admission result SHALL remain RETAINED_SOURCE_TIME_UNKNOWN with SOURCE_TIMESTAMP_INVALID as an additional diagnostic.

#### Scenario: Repeated retained payload
<!-- scenario-id: E1-R2-S01 -->

- **GIVEN** a reading 10000.125 kWh at one source timestamp has been accepted
- **WHEN** MQTT redelivers it ten times
- **THEN** one accepted observation remains and no energy increase is invented

#### Scenario: Timestamp collision
<!-- scenario-id: E1-R2-S02 -->

- **GIVEN** two values 10000 and 10100 share the same meter/epoch/source timestamp
- **WHEN** the second value arrives
- **THEN** the second is retained as a conflict diagnostic and does not replace the accepted value

#### Scenario: Timestamp-free retained replay after restart
<!-- scenario-id: E1-R2-S03 -->

- **GIVEN** an isolated broker retains an old 10000 kWh packet without a timestamp while E1 has persisted a newer accepted 10100 kWh reading, baseline, epoch and lastAcceptedAt
- **WHEN** the server restarts, reconnects and receives the retained packet ten times through the production MQTT callback and M2 extractor with retain=true, including deliveries with dup=false
- **THEN** E1 returns RETAINED_SOURCE_TIME_UNKNOWN with age unknown for each packet, accepted rows/live value/baseline/epoch/lastAcceptedAt remain unchanged, freshness is not refreshed, and no counter-discontinuity or meter-readings-changed event is emitted

---
### Requirement: Unit normalization preserves small counter increments
<!-- requirement-id: E1-R3 -->

The server SHALL normalize supported energy units to kWh using decimal arithmetic before aggregation, apply the configured multiplier exactly once, and retain original values. Unsupported units or non-finite data SHALL fail with a field-specific diagnostic instead of defaulting to kWh.

#### Scenario: Wh normalization
<!-- scenario-id: E1-R3-S01 -->

- **GIVEN** raw readings are 10000000 Wh and 10125000 Wh with multiplier 1
- **WHEN** the service normalizes them
- **THEN** the normalized values are 10000 and 10125 kWh, allowing a later 125 kWh delta

#### Scenario: Large exact register
<!-- scenario-id: E1-R3-S02 -->

- **GIVEN** raw decimal strings differ from 9007199254740992.000 to 9007199254740992.125 kWh
- **WHEN** they are persisted and normalized
- **THEN** the difference remains exactly 0.125 kWh without conversion through an unsafe JavaScript number

---
### Requirement: Source revisions prevent cross-meter differencing
<!-- requirement-id: E1-R4 -->

A mapping change that alters physical identity, measurement kind, energyFlowRole, unit, scale, sourceTimestampTimeZone or timestampPolicy SHALL create a new source revision or meter epoch. The server SHALL NOT subtract across revisions without an explicitly recorded, validated continuity relationship. E6 accounting assignment and siteTimeZone changes SHALL NOT rewrite E1 source revisions or original observations.

#### Scenario: Replace physical meter
<!-- scenario-id: E1-R4-S01 -->

- **GIVEN** the old meter last reads 80000 and a replacement reads 15
- **WHEN** the operator records a replacement
- **THEN** a new epoch starts at 15; the service neither creates a negative delta nor credits 15 as observed interval consumption

#### Scenario: Edit display name only
<!-- scenario-id: E1-R4-S02 -->

- **GIVEN** only the Chinese display name changes
- **WHEN** the source is saved
- **THEN** physical identity and the counter baseline remain unchanged

---
### Requirement: Per-site isolation and safe provenance
<!-- requirement-id: E1-R5 -->

Read and write APIs SHALL preserve existing management authentication, reject a physical meter assigned to all/global, and expose credential-masked provenance. CL and KN readings with equal metric keys SHALL remain different identities. sourceTimestampTimeZone SHALL only parse offset-free source timestamp strings; E6 siteTimeZone SHALL be the sole calendar-boundary authority. Explicit offset/Z timestamps SHALL resolve directly to UTC instants without reinterpretation. Offset-free timestamps SHALL require a reviewed valid IANA sourceTimestampTimeZone; missing configuration, invalid or ambiguous local times SHALL be quarantined with SOURCE_TIMESTAMP_INVALID, without falling back to profile/OS timezone or receive time. Different source and profile timezones SHALL be allowed when source parsing is unambiguous.

The versioned source SHALL persist timestampPolicy as source-required by default or allow-receive-time-estimate only after explicit management review recorded in its source revision and audit; packet data and E6 profiles SHALL NOT grant this approval. A timestamp-absent production packet under source-required SHALL be quarantined with SOURCE_TIMESTAMP_REQUIRED when no earlier transport gate applies. Receive-time fallback SHALL be limited to timestamp-absent production packets with retain=false, dup=false, qos in 0/1/2 and timestampPolicy=allow-receive-time-estimate on that source revision; sourceTimestamp SHALL remain null and timestampQuality SHALL be receive-time-estimated. Missing transport evidence SHALL NOT be interpreted as retain=false; without trustworthy source time it SHALL cause quarantine with TRANSPORT_EVIDENCE_MISSING. Non-retained timestamp-absent dup=true deliveries SHALL return quarantined/DUPLICATE_SOURCE_TIME_UNKNOWN rather than being accepted with a new receive time.

#### Scenario: Same key across sites
<!-- scenario-id: E1-R5-S01 -->

- **GIVEN** CL and KN both use consumptionEnergy
- **WHEN** samples are ingested
- **THEN** their source revisions, samples and live values remain isolated

#### Scenario: Timestamp missing
<!-- scenario-id: E1-R5-S02 -->

- **GIVEN** a production payload lacks an observation timestamp and its packet evidence has retain=false, dup=false and qos=1
- **WHEN** its reviewed source revision has timestampPolicy=allow-receive-time-estimate
- **THEN** sourceTimestamp remains null, the sample is marked receive-time-estimated and it cannot be represented as an exact boundary observation

#### Scenario: Source timezone differs from calendar timezone
<!-- scenario-id: E1-R5-S03 -->

- **GIVEN** sourceTimestampTimeZone is UTC and the site's E6 profile uses Asia/Taipei
- **WHEN** the source reports the offset-free timestamp 2026-08-31T16:00:00 or the explicit-offset timestamp 2026-09-01T00:00:00+08:00
- **THEN** either input resolves to the same sourceTimestamp 2026-08-31T16:00:00Z, and E1 preserves that instant for E2 to identify the September boundary from the E6 profile

#### Scenario: Unresolvable source timestamp is not receive-time fallback
<!-- scenario-id: E1-R5-S04 -->

- **GIVEN** a non-retained packet has an offset-free timestamp with no configured sourceTimestampTimeZone, or an ambiguous 2026-11-01T01:30:00 in America/New_York, or an invalid timestamp
- **WHEN** E1 parses the source timestamp
- **THEN** the observation is quarantined with SOURCE_TIMESTAMP_INVALID, no profile/OS timezone or receivedAt is substituted, and accepted history/baseline/freshness remain unchanged

#### Scenario: Missing packet evidence cannot enable fallback
<!-- scenario-id: E1-R5-S05 -->

- **GIVEN** a timestamp-free MQTT sample arrives without retain/dup/qos evidence
- **WHEN** E1 evaluates admission despite approved receive-time fallback on the source
- **THEN** it returns TRANSPORT_EVIDENCE_MISSING and does not update accepted history, baseline or freshness

#### Scenario: Unapproved receive-time fallback is rejected
<!-- scenario-id: E1-R5-S06 -->

- **GIVEN** a source uses the default timestampPolicy=source-required and a timestamp-free production packet has retain=false, dup=false and qos=1
- **WHEN** admission is evaluated, even if the payload requests receive-time fallback
- **THEN** the packet is quarantined with SOURCE_TIMESTAMP_REQUIRED and accepted history, baseline and freshness remain unchanged

---
### Requirement: Reviewed migration and consumption power roles
<!-- requirement-id: E1-R6 -->

The migration SHALL preserve existing configurations and SHALL require explicit review for uncertain unit semantics. Consumption power aggregation SHALL use registered consumption power channels only; cumulative-energy sources SHALL NOT be converted into instantaneous power by relabeling.

#### Scenario: Generation key shares prefix
<!-- scenario-id: E1-R6-S01 -->

- **GIVEN** factoryGeneration.powerKw and a registered factory load are both present
- **WHEN** consumption power is computed
- **THEN** the generation metric is excluded despite its factory prefix

#### Scenario: Only energy counter exists
<!-- scenario-id: E1-R6-S02 -->

- **GIVEN** a reviewed site has cumulative-energy readings but no power gauge
- **WHEN** a screen requests instantaneous kW
- **THEN** the instantaneous field is unavailable rather than showing the cumulative kWh number

---
### Requirement: Selector provenance accompanies accepted meter observations
<!-- requirement-id: E1-R7 -->

Accepted meter observations from M2 SHALL preserve the reviewed selector version, source revision and physical meter identity. Production MQTT callbacks and M2 extraction SHALL carry origin, retain, dup, qos and receivedAt unchanged into E1 admission. sourceTimestamp and timestampQuality SHALL be derived only from reviewed selector/source parsing rules, with the original timestamp evidence preserved; receivedAt or catalog lastSeen SHALL NOT be substituted as trustworthy source time; M1 catalog retained evidence SHALL map explicitly to retain, and a missing field SHALL NOT be defaulted to false. Observation catalogs, offline examples, failed selector matches and retained replays SHALL NOT bypass the E1-R2/E1-R5 admission rules or independently create new accepted history. Precision rules SHALL apply before any unsafe numeric coercion, including nested JSON counter extraction.

#### Scenario: Preview evidence is not ingestion
<!-- scenario-id: E1-R7-S01 -->

- **GIVEN** M1 captured a candidate before its source was activated
- **WHEN** M2 creates a reviewed binding
- **THEN** E1 waits for the production ingestion path and does not replay the candidate as a new meter reading

#### Scenario: Wrong-tag packet
<!-- scenario-id: E1-R7-S02 -->

- **GIVEN** M2 rejects a packet for another tag
- **WHEN** the meter ingestion service is called for accepted results
- **THEN** that meter receives no observation, timestamp refresh or baseline change

---
### Requirement: Reviewed power live state advances by observation time rather than arrival order

For each concrete site and destination metric key, an admitted reviewed power-gauge observation SHALL update live state only when no prior valid observation exists or its effective observation instant is strictly newer than the persisted live observation. A valid source timestamp SHALL define that instant. Only a packet admitted under the existing explicitly reviewed receive-time-estimate policy SHALL use its original receivedAt instead, and its quality SHALL remain receive-time-estimated.

An older observation SHALL NOT change the live value, unit, timestamp, quality, raw payload or freshness. An equal-instant observation with the same normalized power and unit SHALL be an unchanged replay; an equal-instant observation with different normalized power or unit SHALL preserve the prior observation and produce a conflict diagnostic. Neither case SHALL be reported as a new live update. Comparing timestamps SHALL compare instants, not their textual representation.

The ordering decision SHALL survive a server restart and SHALL be atomic with the live-state write. It SHALL remain scoped to the destination, without blocking another site's or metric key's newer observations. A source revision change alone SHALL NOT authorize a backwards destination timeline. Ignored observations SHALL NOT trigger derived-value recalculation as if that destination had changed; broadcasting an unchanged snapshot SHALL NOT advance its freshness.

This requirement SHALL NOT add power observations to accepted energy history, energy quarantine or meter baselines. Existing packet admission, cumulative-energy processing and unreviewed legacy mapping compatibility SHALL remain unchanged. Invalid timestamp or transport evidence SHALL NOT be rescued by this ordering rule.

#### Scenario: F2 a late power packet cannot rewind the live measurement

- **GIVEN** a reviewed KN power source has saved 20 kW at 2026-09-08T10:02:00Z
- **WHEN** a later delivery reports 5 kW at 2026-09-08T10:01:00Z
- **THEN** the live value remains 20 kW with its original 10:02 timestamp and quality
- **AND** the older packet does not create energy history or a new live-update notification

#### Scenario: A new observation updates normally

- **WHEN** an admitted reviewed power source has no prior valid live observation, or receives 25 kW with a strictly newer effective instant
- **THEN** its live value, unit, timestamp and quality are updated using the admitted observation
- **AND** no energy baseline or accepted energy row is created

#### Scenario: Equal-instant repeat and conflict preserve the first observation

- **GIVEN** 20 kW at 2026-09-08T10:02:00Z is persisted
- **WHEN** equivalent 20 kW is redelivered with timestamp 2026-09-08T18:02:00+08:00
- **THEN** the observation is unchanged and freshness is not refreshed
- **WHEN** 5 kW is then delivered at the same instant
- **THEN** 20 kW remains persisted, a conflict diagnostic is produced, and there is no energy quarantine or live update

#### Scenario: A restart does not erase ordering protection

- **GIVEN** a reviewed power observation is persisted and the server is restarted
- **WHEN** an older timestamped packet arrives through the production ingestion callback, including a retained packet with trustworthy source time
- **THEN** the persisted newer observation remains unchanged without relying on a pre-restart memory cache

#### Scenario: Approved receive-time estimation retains its evidence quality

- **GIVEN** a source revision explicitly allows receive-time estimates and a timestamp-free packet satisfies all existing transport admission requirements
- **WHEN** the packet is processed
- **THEN** its original receivedAt is compared against the persisted effective observation instant, and any update remains receive-time-estimated
- **AND** a packet rejected by existing retained, duplicate, missing-evidence or source-time rules still performs no live update

#### Scenario: Site and destination isolation remain intact

- **GIVEN** CL and KN use the same metric key, and KN also has a different power destination
- **WHEN** an older packet for one destination is ignored and a newer packet for another is processed
- **THEN** only the destination with a newer observation changes, with no cross-site ordering dependency

#### Scenario: Source revision changes cannot silently reset the live timeline

- **GIVEN** a destination has a valid persisted live timestamp and its reviewed source revision changes
- **WHEN** that source delivers an observation older than the persisted destination timestamp
- **THEN** the destination does not move backwards merely because the source revision is new

#### Scenario: Energy and legacy mappings keep their existing behavior

- **WHEN** the same runtime processes a reviewed cumulative-energy source or an unreviewed legacy scalar mapping
- **THEN** it uses that source's existing ingestion and compatibility contract rather than applying the new power-only ordering behavior

<!-- @trace
source: fix-reviewed-power-event-ordering
updated: 2026-09-09
code:
  - apps/server/src/services/mqttMeterIngest.ts
  - apps/server/src/mqtt/reviewedPowerObservationOrdering.ts
  - apps/server/src/mqtt/MqttClientService.ts
tests:
  - apps/server/src/services/mqttMeterIngest.test.ts
  - apps/server/src/mqtt/mqttPowerIngest.test-support.ts
  - apps/server/src/mqtt/mqttPowerSelectorIngest.test.ts
  - apps/server/src/mqtt/mqttReviewedPowerOrdering.test.ts
-->

---
### Requirement: Direct source writes reconcile committed production subscriptions

After an authorized direct source-management write commits, the system SHALL reconcile production reception against the complete committed enabled mapping set. Re-enabling an existing mapping SHALL not require a server restart before the broker can acknowledge its topic. Disabling a source SHALL remove only subscriptions no remaining enabled owner requires. Managed subscriptions and other sources, including sources in other scopes sharing the same topic, SHALL remain intact.

Source validation, ownership, revision and dependency checks SHALL finish before any runtime reconciliation. A rejected write SHALL cause no runtime subscription mutation. A broker failure after commit SHALL NOT roll back source configuration or misrepresent the configuration as uncommitted. Existing direct-management HTTP status codes and the `{ source }` success shape SHALL remain unchanged; saving configuration SHALL NOT assert that a subscription is acknowledged or a measurement has arrived.

#### Scenario: Re-enable a mapping absent from the connected runtime
- **GIVEN** a reviewed source and its mapping are disabled when the production receiver connects, so the topic is not subscribed
- **WHEN** an authorized direct source update enables that source and the broker acknowledges subscription
- **THEN** the source and mapping are enabled, the runtime subscribes without restart, and a subsequent packet can reach the existing reviewed ingestion path

#### Scenario: Disable the last owner of a topic
- **GIVEN** an active topic has exactly one enabled mapping owner and the source has no blocking dependency
- **WHEN** direct management successfully disables that owner
- **THEN** the source and mapping remain disabled and that no-longer-required generic subscription is removed after commit

#### Scenario: Shared topic keeps its remaining owner
- **GIVEN** two enabled sources, potentially in different sites, use the same topic
- **WHEN** one source is successfully disabled through direct management
- **THEN** the topic remains subscribed for the remaining owner and no unrelated managed or generic topic is removed

#### Scenario: Broker refuses reconciliation after a committed save
- **WHEN** the broker refuses a subscription change following an otherwise successful direct source write
- **THEN** the committed source and mapping remain saved, the existing save response remains truthful, an operational diagnostic identifies reconciliation failure without leaking credentials, and receipt of data is not fabricated

#### Scenario: Retry can restore a committed enabled source
- **GIVEN** a source was successfully saved as enabled but subscription was not acknowledged
- **WHEN** the operator repeats a valid direct source update without changing its measurement semantics and the broker is available
- **THEN** reconciliation is retried from current committed mappings, the required topic becomes active, and no artificial source revision or epoch change is required

#### Scenario: Disconnected receiver learns the desired topic set
- **WHEN** a direct source write commits while production reception is disconnected
- **THEN** the desired subscription state reflects the committed mappings, no active subscription or observed reading is falsely reported, and reconnection can subscribe the required topics through the normal runtime lifecycle

#### Scenario: Failed validation never reaches the broker
- **WHEN** a direct source write is rejected for authorization, validation, ownership, stale revision or unresolved dependency
- **THEN** no subscribe or unsubscribe operation is invoked and all source, mapping and audit state retains the existing rejection semantics

<!-- @trace
source: fix-direct-source-runtime-reconciliation
updated: 2026-09-09
code:
  - apps/server/src/services/sourceImpactService.ts
  - apps/server/src/services/mqttMeterIngest.ts
  - docs/reviews/2026-09-09-source-runtime-followup-review.md
  - apps/server/src/mqtt/powerReceptionEvidence.ts
  - apps/server/src/routes/meter-sources.ts
  - apps/server/src/routes/site-energy-profiles.ts
  - apps/server/src/services/guidedMappingActivationService.ts
  - apps/server/src/mqtt/MqttClientService.ts
tests:
  - apps/server/src/routes/mqtt-power-reception.test.ts
  - apps/server/src/mqtt/powerReceptionEvidence.test.ts
  - apps/server/src/routes/meter-sources.test.ts
  - apps/server/src/routes/meter-sources-runtime-reconciliation.test.ts
  - apps/server/src/routes/source-impact-mutation.test.ts
  - apps/server/src/services/sourceImpactService.test.ts
  - apps/server/src/services/mqttMeterIngest.test.ts
-->