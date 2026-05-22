## MODIFIED Requirements

### Requirement: Keep Device Status diagnostics bounded to safe read and refresh actions
The system SHALL keep `Device Status` diagnostics bounded to safe read and refresh actions for display operations, each action SHALL return a truthful server-side result for the requested safe operation, and both the diagnostics summary and the safe actions SHALL only be available to trusted management callers.

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

#### Scenario: Untrusted caller cannot run device diagnostics
- **WHEN** an untrusted caller requests a device diagnostics action or summary
- **THEN** the server SHALL return an explicit denied response
- **AND** it SHALL NOT run the safe diagnostic action on behalf of that caller

##### Example: Public caller cannot export diagnostics summary
- **GIVEN** the request does not satisfy the trusted management read boundary
- **WHEN** the caller posts `export-summary` to `POST /api/device-display-ops/diagnostics`
- **THEN** the server returns a denied response
- **AND** no diagnostic export result is returned to that caller
