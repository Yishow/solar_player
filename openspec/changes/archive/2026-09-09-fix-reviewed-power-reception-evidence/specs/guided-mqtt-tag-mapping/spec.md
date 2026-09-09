## ADDED Requirements

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
