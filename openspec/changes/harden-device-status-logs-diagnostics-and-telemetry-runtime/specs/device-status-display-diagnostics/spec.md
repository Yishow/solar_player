## MODIFIED Requirements

### Requirement: Keep Device Status diagnostics bounded to safe read and refresh actions

The system SHALL keep `Device Status` diagnostics bounded to safe read and refresh actions for display operations, and each action SHALL return a truthful server-side result for the requested safe operation.

#### Scenario: Operator triggers safe display diagnostics action

- **WHEN** the operator triggers a display diagnostics action from `Device Status`
- **THEN** the action performs a safe read, refresh, or summary export operation
- **AND** the response reflects the actual server-side diagnostic result and timestamp instead of placeholder-only success text
- **AND** it does not perform dangerous device control by default

##### Example: Refresh readiness reports a real safe result

- **GIVEN** the operator chooses `refresh-readiness` from `Device Status`
- **WHEN** the server completes the safe diagnostic action
- **THEN** the response names `refresh-readiness` as the action that ran
- **AND** the returned summary matches the refreshed safe diagnostic output
