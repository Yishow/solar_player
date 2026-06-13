## ADDED Requirements

### Requirement: Energy Trend and Energy History reuse warm history payloads by range

The system SHALL let Energy Trend and Energy History reuse warm history payloads by the selected range before issuing background refreshes.

#### Scenario: Energy History opens a range already resolved by Energy Trend

- **WHEN** Energy Trend already resolved a history payload for a given range in the current session
- **THEN** Energy History initializes from that warm payload when it opens the same range
- **AND** it refreshes the range in the background instead of performing a cold visible reset

##### Example: History opens the day range after Trend

- **GIVEN** Energy Trend has stored a `day` history payload in the shared range cache
- **WHEN** Energy History opens with the `day` range selected
- **THEN** Energy History uses the cached `day` snapshots for its first visible chart state
- **AND** it still starts the `day` history refresh in the background

#### Scenario: Energy Trend switches back to a warm range

- **WHEN** Energy Trend switches back to a range that was already resolved earlier in the session
- **THEN** the page restores the warm payload immediately
- **AND** it refreshes that range in the background without losing the current visible chart state

##### Example: Trend returns from week to day

- **GIVEN** Energy Trend has cached `day` and `week` history payloads
- **WHEN** the operator switches from `week` back to `day`
- **THEN** the chart resolves the cached `day` payload instead of keeping the stale `week` payload
- **AND** the `day` refresh runs without a cold empty chart flash

### Requirement: Energy History keeps partial-source semantics while using shared cache

The system SHALL preserve Energy History source-level loading and degraded semantics while reusing shared warm cache.

#### Scenario: One history source stays degraded while the warm payload remains visible

- **WHEN** one Energy History source fails during refresh after the page already showed a warm payload
- **THEN** the page keeps the warm payload visible
- **AND** it exposes degraded state only for the failing source instead of collapsing the whole page to a cold state

##### Example: summaries fail while snapshots remain warm

- **GIVEN** Energy History has a warm `month` snapshot payload
- **WHEN** the `daily-summary` source fails during a `month` refresh
- **THEN** the page keeps the warm snapshot chart visible
- **AND** only the summary lane contributes degraded state to the operator-facing status
