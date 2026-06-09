## ADDED Requirements

### Requirement: Present kiosk exit and re-entry guidance on Device Status

The system SHALL present a first-class kiosk exit action on `Device Status`, and the same surface SHALL explain how the operator re-enters the system after leaving the kiosk browser.

#### Scenario: Operator prepares to leave the kiosk

- **WHEN** the operator opens `Device Status`
- **THEN** the page shows an explicit `離開系統` action in the device action area
- **AND** the page shows re-entry guidance telling the operator to return from the desktop by clicking `Solar Display Kiosk`

#### Scenario: Exit action is unavailable to an untrusted reader

- **WHEN** the request context is not trusted for management access
- **THEN** the page SHALL NOT claim that kiosk exit is available
- **AND** it SHALL preserve the existing trusted-access boundary semantics for device operations
