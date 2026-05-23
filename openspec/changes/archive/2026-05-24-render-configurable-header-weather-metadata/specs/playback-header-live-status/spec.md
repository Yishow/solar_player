## MODIFIED Requirements

### Requirement: Header does not display fabricated weather

The playback header SHALL NOT display fabricated weather information. When real weather data is enabled and available through the internal weather contract, the header SHALL render only metadata derived from that contract; otherwise it SHALL render a neutral fallback rather than a fake condition.

#### Scenario: Configured weather is unavailable

- **WHEN** the playback header cannot resolve a ready weather summary from the internal weather contract
- **THEN** it SHALL render a neutral fallback state for the weather slot
- **AND** it SHALL NOT render a fabricated weather value such as `晴 26°C`

#### Scenario: Real weather is available

- **WHEN** the playback header receives enabled and normalized weather metadata from the internal weather contract
- **THEN** it SHALL render that real weather metadata in the weather slot
- **AND** it SHALL NOT substitute a hard-coded weather string

##### Example: playback header keeps live status and real weather together

- **GIVEN** the playback shell resolves `statusLabel=Online`
- **AND** the internal weather contract resolves `primaryText=台北 多雲 31°C` and `secondaryText=濕度 72%・觀測 14:20`
- **WHEN** the playback header renders
- **THEN** it SHALL display the `Online` badge together with the weather slot
- **AND** it SHALL NOT replace the weather slot with a hard-coded string
