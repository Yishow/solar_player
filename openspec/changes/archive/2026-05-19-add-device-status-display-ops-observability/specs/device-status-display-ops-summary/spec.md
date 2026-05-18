## ADDED Requirements

### Requirement: Extend Device Status with display operations summary

The system SHALL extend `Device Status` with display operations summary so operators can see current live display state alongside host health.

#### Scenario: Device Status shows latest live display state

- **WHEN** the operator opens `Device Status`
- **THEN** the page shows a summary of live display version, recent publish state, or pending draft backlog
- **AND** those display-operation values remain distinct from raw host metrics

### Requirement: Show degraded display summary without hiding host health

The system SHALL show degraded display summary without hiding the existing host-health information.

#### Scenario: Display summary service is degraded

- **WHEN** display summary data is unavailable or degraded
- **THEN** `Device Status` still shows host-health cards
- **AND** it marks display summary as unavailable or degraded
