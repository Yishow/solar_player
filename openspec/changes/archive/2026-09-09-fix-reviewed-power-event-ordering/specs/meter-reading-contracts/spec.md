## ADDED Requirements

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
