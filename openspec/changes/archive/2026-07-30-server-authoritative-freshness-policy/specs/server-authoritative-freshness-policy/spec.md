## ADDED Requirements

### Requirement: Manage four global Freshness Policy categories

The Server SHALL maintain exactly four Freshness Policy categories: realtime, daily, cumulative, and static. Non-static categories SHALL define strictly increasing delayedAfterMs, staleAfterMs, and historicalAfterMs values. Static data SHALL NOT degrade solely because of age.

#### Scenario: Seed the default category boundaries

- **WHEN** the Freshness Policy is initialized
- **THEN** it uses the default boundary table

##### Example: default boundaries

| Category | Delayed | Stale | Historical |
| --- | ---: | ---: | ---: |
| realtime | 30000 ms | 90000 ms | 1800000 ms |
| daily | 93600000 ms | 172800000 ms | 604800000 ms |
| cumulative | 600000 ms | 3600000 ms | 86400000 ms |
| static | never | never | never |

#### Scenario: Reject a non-increasing policy

- **WHEN** a trusted manager submits staleAfterMs less than or equal to delayedAfterMs
- **THEN** the Server returns 400 with a validation code
- **AND** the prior Policy remains active

### Requirement: Return Server-authoritative freshness metadata

For each datum, the Server SHALL calculate state as live, delayed, stale, historical, or unavailable from trusted App Time and sourceTimestamp. It SHALL return category, state, sourceTimestamp, ageMs, and nextTransitionAt.

#### Scenario: Source timestamp is missing

- **WHEN** a required datum has no sourceTimestamp
- **THEN** the Server returns state=unavailable
- **AND** it does not substitute response time or load time

### Requirement: Keep Site-scoped Readiness and Rotation consistent

Readiness, Story, and Effective Rotation SHALL consume the same Server freshness result for the authenticated Context Site Scope. A stale source from another Site SHALL NOT block or downgrade the current Site.

#### Scenario: KN cumulative data is historical while CL is live

- **WHEN** a CL Device requests Readiness and Rotation
- **THEN** CL uses the live CL result
- **AND** the KN historical result is excluded from the CL decision

### Requirement: Preserve freshness semantics during temporary disconnection

While App Time remains trusted, a disconnected Client SHALL advance the last Server freshness result using monotonic elapsed time. In time-untrusted state it SHALL freeze age and state and SHALL set ageFrozen=true.

#### Scenario: Client becomes time-untrusted

- **WHEN** 1800000 milliseconds pass after the last valid Time Signal
- **THEN** freshness state stops escalating
- **AND** ageMs stops increasing until synchronization returns

### Requirement: Present provenance for non-live data

Delayed data SHALL display the semantic label Data delayed, stale data SHALL display Non-live data, and historical data SHALL display Historical snapshot. Every non-live state SHALL show the complete source time and SHALL suppress live pulse, trend direction, and current-time wording.

#### Scenario: Historical metric is rendered

- **WHEN** a metric has state=historical
- **THEN** its UI displays Historical snapshot and the source timestamp
- **AND** it does not display live animation or wording that identifies the value as current
