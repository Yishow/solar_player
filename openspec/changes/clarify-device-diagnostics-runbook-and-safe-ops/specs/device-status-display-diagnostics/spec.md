## MODIFIED Requirements

### Requirement: Keep Device Status diagnostics bounded to safe read and refresh actions
The system SHALL keep `Device Status` diagnostics bounded to safe read and refresh actions for display operations, each action SHALL return a truthful server-side result for the requested safe operation, and the diagnostics surface SHALL also tell operators when a host-level runbook is required instead of an in-app device control.

#### Scenario: Operator triggers safe display diagnostics action
- **WHEN** a trusted management caller triggers a display diagnostics action from `Device Status`
- **THEN** the action performs a safe read, refresh, or summary export operation
- **AND** the response reflects the actual server-side diagnostic result and timestamp instead of placeholder-only success text
- **AND** it does not perform dangerous device control by default

##### Example: Refresh readiness reports a real safe result
- **GIVEN** the operator chooses `refresh-readiness` from `Device Status`
- **AND** the caller is trusted for management diagnostics
- **WHEN** the server completes the safe diagnostic action
- **THEN** the response names `refresh-readiness` as the action that ran
- **AND** the returned summary matches the refreshed safe diagnostic output

#### Scenario: Unsupported device controls provide explicit host-level guidance
- **WHEN** an operator requests a device control that is not supported inside the app runtime
- **THEN** the response SHALL state that the operation was not executed in-app
- **AND** it SHALL point the operator to the host-level runbook or restart guidance instead

##### Example: Reboot route stays informational only
- **GIVEN** reboot remains disabled in the application runtime
- **WHEN** an operator requests the reboot control
- **THEN** the system states that reboot was not executed
- **AND** it points the operator to the host-level restart guidance
