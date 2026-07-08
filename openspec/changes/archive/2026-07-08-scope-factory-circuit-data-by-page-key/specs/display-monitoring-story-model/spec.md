## ADDED Requirements

### Requirement: Factory Circuit monitoring story supports page instances
The system SHALL support Factory Circuit monitoring story payloads for each registered Factory Circuit page instance.

#### Scenario: Page-scoped Factory Circuit story payload is requested
- **WHEN** a caller requests a Factory Circuit page instance story by page key
- **THEN** the story payload SHALL preserve the shared monitoring story model fields
- **AND** the story payload SHALL resolve slots, KPIs, fallback reasons, source topics, and labels from the requested page instance

##### Example: Aggregate dependency keys match the requested page
- **GIVEN** `factory-circuit` has 6 scoped slots
- **AND** `factory-circuit-guanyin` has 8 scoped slots
- **WHEN** each page instance story is resolved
- **THEN** the `totalPower` dependency keys for `factory-circuit` SHALL contain 6 slot keys
- **AND** the `totalPower` dependency keys for `factory-circuit-guanyin` SHALL contain 8 slot keys
