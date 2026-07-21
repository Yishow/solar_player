## ADDED Requirements

### Requirement: Identify the playback-scoped factory source for Sustainability

Sustainability cumulative generation and carbon reduction SHALL expose provenance that identifies the MQTT factory summaries required by the current playback factory scope, their completeness, and the applicable source update time.

#### Scenario: One factory source is selected

- **WHEN** playback settings resolve Sustainability to CL-only or KN-only
- **THEN** provenance SHALL identify only that factory source
- **AND** freshness SHALL be evaluated from that factory source timestamp
- **AND** the unselected factory state SHALL NOT degrade the selected source

##### Example: CL-only ignores stale KN

- **GIVEN** only `factory-circuit` is enabled, CL was updated at `15:38:10`, and KN is stale
- **WHEN** Sustainability renders
- **THEN** provenance identifies CL, reports fresh, and uses `15:38:10`

#### Scenario: Both factory sources are current

- **WHEN** both factory pages are enabled and Sustainability renders cumulative generation and carbon reduction from a complete CL plus KN aggregate
- **THEN** provenance SHALL identify both factory sources
- **AND** it SHALL report a fresh aggregate state
- **AND** its update time SHALL equal the older CL or KN source timestamp

##### Example: KN has the older timestamp

- **GIVEN** CL was updated at `15:38:10` and KN was updated at `15:37:55`
- **WHEN** Sustainability renders the complete aggregate
- **THEN** provenance identifies CL and KN, reports fresh, and uses `15:37:55` as the aggregate update time

#### Scenario: A required factory source becomes unavailable

- **WHEN** a source required by the current scope becomes missing, stale, invalid, or regresses
- **THEN** Sustainability provenance SHALL identify the affected factory and degraded scoped state
- **AND** the displayed value SHALL NOT be presented as a newly complete scoped total

##### Example: CL total becomes invalid

- **GIVEN** the last complete displayed total is 13645.876 MWh
- **WHEN** both factories are enabled and CL summary omits `total_mwh` while KN remains current
- **THEN** provenance identifies CL as invalid and the page does not label a KN-only value as a complete aggregate

#### Scenario: No factory source is selected

- **WHEN** both factory playback pages are disabled
- **THEN** provenance SHALL state that no factory is selected
- **AND** it SHALL NOT present a previous CL, KN, or CL plus KN timestamp as current

##### Example: Previous combined timestamp is suppressed

- **GIVEN** the last combined source timestamp was `15:37:55` and both factory pages are now disabled
- **WHEN** Sustainability renders
- **THEN** provenance reports no factory selected and does not show `15:37:55` as a current source time
