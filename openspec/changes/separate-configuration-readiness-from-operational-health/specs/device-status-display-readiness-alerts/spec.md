## MODIFIED Requirements

### Requirement: Show display readiness and skip alerts in Device Status

The system SHALL show display readiness and skip alerts in `Device Status`, and each alert SHALL identify whether it originates from configuration readiness or operational health.

#### Scenario: A display page is skipped or not ready

- **WHEN** a display page is currently skipped or blocked by readiness issues
- **THEN** `Device Status` surfaces that alert in its display-operations area
- **AND** the alert remains understandable without opening another management page

#### Scenario: Readiness and operational alerts stay distinguishable

- **GIVEN** `Device Status` receives one readiness blocking alert and one live operational fault alert
- **WHEN** the operator reviews the display-operations alerts list
- **THEN** the readiness alert is labeled as `configuration-readiness`
- **AND** the operational fault alert is labeled as `operational-health`

##### Example: Missing slot binding and unhealthy asset remain in different alert domains

- **GIVEN** `factory-circuit` has a missing required slot binding
- **AND** `overview` references an unhealthy live asset
- **WHEN** the operator opens `Device Status`
- **THEN** the slot-binding alert stays in the `configuration-readiness` domain
- **AND** the asset-health alert stays in the `operational-health` domain
