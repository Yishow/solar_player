## ADDED Requirements

### Requirement: Integrate status indicator into factory circuits card title

The system SHALL render the circuit settings status indicator (`mgmt-status cs-status`) inline within the factory circuits card title (`settings-card__title`) instead of absolute positioning at the top-right of the layout.

#### Scenario: Status indicator is shown in the card title

- **WHEN** the circuit settings page is loaded and status feedback is active
- **THEN** the status indicator SHALL be positioned inside the card title layout container
- **AND** the status indicator SHALL NOT float outside the card container
