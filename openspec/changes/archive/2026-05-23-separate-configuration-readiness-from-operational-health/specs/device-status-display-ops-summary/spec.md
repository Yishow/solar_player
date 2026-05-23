## MODIFIED Requirements

### Requirement: Extend Device Status with display operations summary

The system SHALL extend `Device Status` with display operations summary so operators can see current live display state alongside host health, and it SHALL keep configuration readiness summary distinct from operational health summary.

#### Scenario: Device Status shows latest live display state

- **WHEN** the operator opens `Device Status`
- **THEN** the page shows a summary of live display version, recent publish state, or pending draft backlog
- **AND** those display-operation values remain distinct from raw host metrics

#### Scenario: Configuration readiness does not double-count as operational degradation

- **GIVEN** `Device Status` receives configuration readiness findings and operational display faults from separate sources
- **WHEN** a page is blocked by missing readiness prerequisites but there are no live skip, asset, or runtime health faults
- **THEN** the configuration readiness summary reports the blocking readiness findings
- **AND** the operational health summary SHALL NOT mark the display state as degraded only because of those readiness findings

##### Example: Missing MQTT mapping stays in readiness without creating a fake runtime fault

- **GIVEN** `overview` is missing a required MQTT mapping
- **AND** there are no skipped pages and no asset-health faults in live playback
- **WHEN** the operator opens `Device Status`
- **THEN** the readiness summary reports the blocking mapping gap
- **AND** the operational health summary remains non-degraded for that condition alone
