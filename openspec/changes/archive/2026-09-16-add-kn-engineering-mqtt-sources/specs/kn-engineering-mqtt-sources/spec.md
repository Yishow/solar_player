## Purpose

Define the eight fixed Guanyin engineering source identities, their distinct data modes (power-gauge, daily-report, cumulative-energy), topic namespaces, bounded admission gates, and configuration workflows without requiring physical meter emulation.

## ADDED Requirements

### Requirement: Engineering identity is independent of physical acquisition
<!-- requirement-id: KNE-R1 -->

The Player SHALL register KN engineering sources using the existing eight engineering IDs and an explicit sourceKind=engineering. Upstream acquisition, per-meter grouping and internal formulas SHALL remain publisher-owned. A reviewed engineering result SHALL be eligible as authoritative even when calculated upstream. Player SHALL NOT require meterId, DDE Item, OPC NodeId or a copied CL device list to create or activate this source kind. Missing payload contracts SHALL leave the mode unconfigured rather than implying a physical-meter requirement.

#### Scenario: Engineering aggregate without meter identity
<!-- scenario-id: KNE-R1-S01 -->

- **GIVEN** an authorized painting result is produced from upstream aggregation without exposing meter IDs
- **WHEN** the operator registers the engineering source
- **THEN** registration permits an engineering identity and requests its result contract and coverage, not fabricated physical fields

#### Scenario: Eight existing identities
<!-- scenario-id: KNE-R1-S02 -->

- **GIVEN** KN engineering reception is opened
- **WHEN** the list is initialized
- **THEN** stamping, body, painting, assembly, utility, office, heavy_vehicle and ed_coating remain distinct rows, including those with no packets

#### Scenario: Alias is not approval
<!-- scenario-id: KNE-R1-S03 -->

- **GIVEN** a payload says paint or utilities
- **WHEN** the registry validates it
- **THEN** it does not silently become painting or utility; an unknown identity is rejected without changing the eight approved IDs

### Requirement: Measurement mode is explicit and preserves topic meaning
<!-- requirement-id: KNE-R2 -->

Each engineering source SHALL declare power-gauge, daily-report or cumulative-energy, with unit kW or kWh and a reviewed exact topic. Publishing cadence SHALL NOT select the mode. The existing factory/guanyin/power/{engineeringId} namespace SHALL retain power semantics. Proposed factory/guanyin/energy/daily/{engineeringId} and factory/guanyin/energy/cumulative/{engineeringId} SHALL remain distinct. A source CAN provide power independently, but one engineering energy purpose SHALL use only one authoritative mode within an effective period. Unconfigured mode SHALL block activation, not saving a draft.

#### Scenario: Energy on a power topic
<!-- scenario-id: KNE-R2-S01 -->

- **GIVEN** a packet contains kWh on the configured power topic
- **WHEN** it is validated
- **THEN** the packet is rejected and the kW destination is unchanged

#### Scenario: One publication per day
<!-- scenario-id: KNE-R2-S02 -->

- **GIVEN** only publication frequency is known
- **WHEN** onboarding chooses source semantics
- **THEN** neither daily-report nor cumulative-energy is inferred; mode selection and a matching example are required

#### Scenario: Only engineering energy exists
<!-- scenario-id: KNE-R2-S03 -->

- **GIVEN** a daily-report source is approved without power data
- **WHEN** the engineering view renders
- **THEN** the energy result can be used and instantaneous power remains unavailable without synthesizing kW

### Requirement: Engineering subscription intent preserves independent owners
<!-- requirement-id: KNE-R3 -->

Production subscriptions SHALL be generated from approved enabled engineering exact topics and combined with existing managed Solar and generic/physical owners. Disabling a source SHALL remove a topic only after its last owner is removed. Discovery SHALL use an independently bounded approved scope and client, never # or a silent site-wide expansion. Each acknowledgement SHALL be tied to its actual client and connection generation. Receiver edits SHALL not write publisher settings, issue control commands or delete source history.

#### Scenario: One engineering source disabled
<!-- scenario-id: KNE-R3-S01 -->

- **GIVEN** eight engineering sources and managed Solar are desired
- **WHEN** painting is disabled
- **THEN** the other seven engineering intents and Solar filters remain; shared exact-topic owners prevent premature unsubscribe

#### Scenario: Capture expiration
<!-- scenario-id: KNE-R3-S02 -->

- **GIVEN** discovery observes the same engineering topic as production
- **WHEN** capture expires
- **THEN** only discovery is closed and production reception continues

#### Scenario: Stale acknowledgement
<!-- scenario-id: KNE-R3-S03 -->

- **GIVEN** a previous client generation acknowledges after reconnect
- **WHEN** runtime processes the callback
- **THEN** it cannot mark current subscriptions active; current desired intent is reconciled

### Requirement: Engineering validation precedes generic fallback and binds review
<!-- requirement-id: KNE-R4 -->

The engineering protocol gate SHALL validate bounded strict JSON, sourceKind, version, mode, site, engineering identity, approved publisher authority, definition/calendar revision, unit, decimal and temporal semantics before extraction. Duplicate JSON keys, unknown schema versions, invalid identity and production exampleOnly data SHALL be handled rejections with no generic fallback. Preview and production SHALL use the same semantic gate, with origins explicitly separated. CanonicalDraft and previewToken SHALL bind all authority, mode, definition, schedule and replay policies; changes SHALL require re-preview. Payload publisherId SHALL not be presented as authenticated proof. Activation SHALL fail visibly when protocol support is absent.

#### Scenario: Valid number in an invalid envelope
<!-- scenario-id: KNE-R4-S01 -->

- **GIVEN** value is numeric but site or schema does not match registration
- **WHEN** preview or production dispatch runs
- **THEN** both reject before $.value parsing can create a live value or history

#### Scenario: Changed policy after preview
<!-- scenario-id: KNE-R4-S02 -->

- **GIVEN** a preview binds one definition and publisher
- **WHEN** apply changes that binding or its schedule with the old token
- **THEN** apply conflicts with zero source writes and preserves the draft

#### Scenario: Offline sample is not production
<!-- scenario-id: KNE-R4-S03 -->

- **GIVEN** an exampleOnly packet was used for a valid preview
- **WHEN** source activation succeeds
- **THEN** no example is ingested and the UI separately awaits or explicitly backfills authorized production evidence

#### Scenario: No engineering gate installed
<!-- scenario-id: KNE-R4-S04 -->

- **GIVEN** the server exposes only physical/generic mapping support
- **WHEN** engineering activation is requested
- **THEN** it is blocked as unsupported, not emulated with a fake meterId

### Requirement: Power and engineering counters retain observation semantics
<!-- requirement-id: KNE-R5 -->

Engineering power and cumulative sources SHALL preserve exact decimal values, genuine upstream aggregate observation time, definition revision and sample identity. Neither legacy ts nor readAt, publishedAt or receivedAt SHALL be substituted as a trustworthy checkpoint. Power SHALL advance live state only for a newer admitted observation; equal-time contradictory values SHALL conflict. Counters SHALL be differenced only within a reviewed continuous definition and counterEpoch with adequate boundary evidence. Definition changes, resets and mode transitions SHALL not manufacture energy or integrate power. Display renames or process restarts alone SHALL not create epochs.

#### Scenario: Continuous engineering counter
<!-- scenario-id: KNE-R5-S01 -->

- **GIVEN** one approved engineering counter reads 1000 then 1120 in the same definition and epoch
- **WHEN** its eligible period is evaluated
- **THEN** the difference is 120 kWh, independent of how many physical meters the upstream used

#### Scenario: Definition changes
<!-- scenario-id: KNE-R5-S02 -->

- **GIVEN** engineering membership changes from definition 1 to 2
- **WHEN** a period crosses the change
- **THEN** no unapproved cross-definition subtraction occurs; the result exposes a gap or continuity review requirement

#### Scenario: Power arrives out of order
<!-- scenario-id: KNE-R5-S03 -->

- **GIVEN** painting power at 10:02 is current
- **WHEN** a 10:01 packet arrives later
- **THEN** the live value and freshness do not move backward

#### Scenario: No checkpoint time
<!-- scenario-id: KNE-R5-S04 -->

- **GIVEN** an upstream counter has only publishedAt
- **WHEN** the counter is previewed for period accounting
- **THEN** it is not silently given a source time and activation remains blocked until the required checkpoint contract is reviewed

### Requirement: Engineering workspace separates configuration from report delivery
<!-- requirement-id: KNE-R6 -->

The workspace SHALL display the eight engineering rows independently of recent traffic, with source mode, subscription state, usable period, completeness, data revision and scheduled delivery state. Its inspector SHALL identify site/engineering and expose overview, subscription/fields, periods/versions and usage without mandatory physical-meter inputs. Daily delivery SHALL use a reviewed deadline and grace in the site calendar, not a physical raw-source stale timeout. Absent schedules or failed reads SHALL be unknown rather than zero or healthy. Live result revisions SHALL not overwrite configuration drafts, steal focus or trigger configuration-dirty state. Saving, subscribing, receiving and usable results SHALL remain distinct.

#### Scenario: Seven received reports
<!-- scenario-id: KNE-R6-S01 -->

- **GIVEN** seven of eight expected engineering reports are received
- **WHEN** the overview renders
- **THEN** all eight rows remain and the missing engineering is named without a zero substitute

#### Scenario: Report not yet due
<!-- scenario-id: KNE-R6-S02 -->

- **GIVEN** a daily report is within the reviewed delivery deadline although no packet arrived for 90 seconds
- **WHEN** delivery state is evaluated
- **THEN** it remains not-due or waiting, independent of publisher heartbeat and receiver connectivity

#### Scenario: Correction while editing
<!-- scenario-id: KNE-R6-S03 -->

- **GIVEN** the operator edits a source label and a new report dataRevision arrives
- **WHEN** the inspector refreshes report evidence
- **THEN** the draft and caret remain unchanged while the periods/versions section shows the correction

#### Scenario: Daily sender outside capture window
<!-- scenario-id: KNE-R6-S04 -->

- **GIVEN** a sender publishes outside a 180-second discovery capture
- **WHEN** onboarding is opened
- **THEN** a reviewed contract or offline example can prepare a draft; a silent capture is not evidence that the engineering does not exist

### Requirement: Source authority and migration are versioned without duplicating results
<!-- requirement-id: KNE-R7 -->

An engineering purpose SHALL have at most one approved canonical authority per effective period. Authority, source-configuration, engineering-definition, accounting-profile, counter-epoch and report-data revisions SHALL remain separate. Sender replacement SHALL preserve business report identity and revision lineage. Mode or definition changes for daily results SHALL take effect at site-day boundaries; an unrepresentable mid-day split SHALL be rejected rather than prorated. Cutover and rollback SHALL preserve history, other sites and Solar ownership. Unknown conflicts SHALL block activation, not fall back to another unreviewed source.

#### Scenario: Two publishers claim one engineering
<!-- scenario-id: KNE-R7-S01 -->

- **GIVEN** two registrations claim the same engineering energy purpose and effective day
- **WHEN** the second is activated
- **THEN** the overlap is rejected unless a reviewed cutover closes the first without creating a second report authority

#### Scenario: Daily and counter modes coexist in shadow
<!-- scenario-id: KNE-R7-S02 -->

- **GIVEN** two transport modes represent painting energy
- **WHEN** shadow validation runs
- **THEN** only the selected canonical provider contributes to accounting and the other remains comparison evidence

#### Scenario: Receiver rollback
<!-- scenario-id: KNE-R7-S03 -->

- **GIVEN** a new KN integration fails
- **WHEN** new admission is disabled
- **THEN** engineering history and CL/Solar configuration remain intact; physical fallback is not automatically activated
