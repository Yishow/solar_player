## ADDED Requirements

### Requirement: Typed source semantics and physical meter identity
<!-- requirement-id: E1-R1 -->

The ingestion service SHALL require a versioned measurement kind, unit, meter identity and concrete site for every energy source admitted to period calculation. Power gauges, cumulative counters and interval energy SHALL remain distinguishable. Solar generation and consumption SHALL use explicit roles rather than a common key prefix.

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

### Requirement: Immutable samples and idempotent ingestion
<!-- requirement-id: E1-R2 -->

The server SHALL persist original and normalized decimal values with source and receive timestamps, site, meter, channel, revision, epoch and quality. Repeated transport deliveries SHALL NOT create additional accepted energy observations. Conflicting readings with the same identity and source timestamp SHALL be quarantined.

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

### Requirement: Source revisions prevent cross-meter differencing
<!-- requirement-id: E1-R4 -->

A mapping change that alters physical identity, measurement kind, unit or scale SHALL create a new source revision or meter epoch. The server SHALL NOT subtract across revisions without an explicitly recorded, validated continuity relationship.

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

### Requirement: Per-site isolation and safe provenance
<!-- requirement-id: E1-R5 -->

Read and write APIs SHALL preserve existing management authentication, reject a physical meter assigned to all/global, and expose credential-masked provenance. CL and KN readings with equal metric keys SHALL remain different identities.

#### Scenario: Same key across sites
<!-- scenario-id: E1-R5-S01 -->

- **GIVEN** CL and KN both use consumptionEnergy
- **WHEN** samples are ingested
- **THEN** their source revisions, samples and live values remain isolated

#### Scenario: Timestamp missing
<!-- scenario-id: E1-R5-S02 -->

- **GIVEN** a payload lacks an observation timestamp
- **WHEN** an approved receive-time fallback is used
- **THEN** the sample is marked receive-time-estimated and cannot be represented as an exact boundary observation

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

### Requirement: Selector provenance accompanies accepted meter observations
<!-- requirement-id: E1-R7 -->

Accepted meter observations from M2 SHALL preserve the reviewed selector version, source revision and physical meter identity, with packet/source-time provenance from M1 when available. Observation catalogs, offline examples, failed selector matches and retained replays SHALL not independently create new accepted history. Precision rules SHALL apply before any unsafe numeric coercion, including nested JSON counter extraction.

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

