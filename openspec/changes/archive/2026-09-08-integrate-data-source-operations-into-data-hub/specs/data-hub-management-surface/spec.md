## ADDED Requirements

### Requirement: Operational maintenance surface preserves global calculation parameters and scoped resets
<!-- requirement-id: U1-M2 -->

The Data Hub management application SHALL host calculation settings and operational trend maintenance within the unified workspace. Calculation settings SHALL update global energy emission and tariff constants across playback consumers. Trend resets SHALL respect the active management scope and require confirmation before execution.

#### Scenario: Updating calculation settings
<!-- scenario-id: U1-M2-S01 -->

- **GIVEN** an authorized operator updates the carbon emission factor or electricity tariff
- **WHEN** the form is submitted successfully
- **THEN** the new settings are saved to the backend
- **AND** a success confirmation banner is displayed without discarding valid form inputs

#### Scenario: Scoped trend reset confirmation
<!-- scenario-id: U1-M2-S02 -->

- **GIVEN** an operator requests a trend reset for the selected site scope
- **WHEN** the action is triggered
- **THEN** an explicit confirmation is required before the reset request is dispatched to the server
