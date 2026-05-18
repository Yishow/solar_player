## ADDED Requirements

### Requirement: Keep Device Status diagnostics bounded to safe read and refresh actions

The system SHALL keep `Device Status` diagnostics bounded to safe read and refresh actions for display operations.

#### Scenario: Operator triggers safe display diagnostics action

- **WHEN** the operator triggers a display diagnostics action from `Device Status`
- **THEN** the action performs a safe read, refresh, or summary export operation
- **AND** it does not perform dangerous device control by default

### Requirement: Reuse display diagnostics outputs from shared services

The system SHALL reuse display diagnostics outputs from shared readiness, publish, or asset services instead of recomputing unrelated display state inside Device Status.

#### Scenario: Device Status exports display summary

- **WHEN** the page requests a display diagnostics export or refresh result
- **THEN** the returned data uses the same underlying display-operation findings as other management surfaces
- **AND** the operator can correlate the result with current display issues

##### Example: Exported summary matches current readiness and publish findings

- **GIVEN** the device status page shows one skipped page and one pending draft backlog item
- **WHEN** the operator exports the display diagnostics summary
- **THEN** the exported summary uses those same skip and publish findings
- **AND** the operator can correlate the export with the current on-screen display issues
