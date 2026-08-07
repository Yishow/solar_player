## ADDED Requirements

### Requirement: Present an unlock surface in place of management content

When the gate is enabled and the browser holds no valid management session, the management shell SHALL render an unlock surface in place of management page content without changing the current URL. After a successful unlock the shell SHALL render the originally requested management page.

When the gate state cannot be read, the management shell SHALL render the unlock surface rather than management content, so that a read failure fails toward stricter access.

When any management API returns the management access denied envelope, the management shell SHALL return to the unlock surface rather than rendering blank or error content.

#### Scenario: Locked management route shows the unlock surface

- **WHEN** the gate is enabled, no valid session exists, and a management route is opened
- **THEN** the management shell SHALL render the unlock surface instead of the management page content
- **AND** the browser URL SHALL remain the requested management route

#### Scenario: Unlocking reveals the requested page

- **WHEN** the correct password is submitted from the unlock surface
- **THEN** the shell SHALL render the originally requested management page
- **AND** no route redirect SHALL occur

#### Scenario: Gate state read failure fails toward the unlock surface

- **WHEN** the management shell cannot read the gate state
- **THEN** it SHALL render the unlock surface
- **AND** it SHALL NOT render management page content

#### Scenario: Session lost mid-session returns to the unlock surface

- **WHEN** a management API returns the management access denied envelope while the operator is using a management page
- **THEN** the shell SHALL return to the unlock surface

#### Scenario: Gate disabled renders management content directly

- **WHEN** the gate is disabled and a management route is opened
- **THEN** the shell SHALL render the management page content without an unlock surface

---

### Requirement: Reflect server-owned lock state on the unlock surface

The unlock surface SHALL present the locked state and its end time using values returned by the server. It SHALL NOT count failed attempts in the browser and SHALL NOT decide locally whether a cooldown has elapsed. While locked, the unlock surface SHALL prevent submission. Failure feedback SHALL NOT indicate whether the submitted password was close to correct.

#### Scenario: Locked state disables submission

- **WHEN** the server reports that unlocking is locked until a given time
- **THEN** the unlock surface SHALL show the locked state and that time
- **AND** submission SHALL be prevented while locked

#### Scenario: Wrong password feedback reveals nothing

- **WHEN** an incorrect password is submitted and the server reports an authentication failure
- **THEN** the unlock surface SHALL report only that the password was incorrect

---

### Requirement: Operate the gate from a management security settings surface

The system SHALL provide a management settings page that enables the gate with a new password, disables the gate, and changes the password, by calling the management password gate API. The page SHALL prevent submission when enabling the gate without a new password, and when changing the password without the current password, and SHALL state which field is missing.

#### Scenario: Enabling without a new password cannot be submitted

- **WHEN** the operator enables the gate without entering a new password
- **THEN** the page SHALL prevent submission
- **AND** the page SHALL state that a new password is required

#### Scenario: Changing the password without the current password cannot be submitted

- **WHEN** the operator enters a new password without entering the current password
- **THEN** the page SHALL prevent submission
- **AND** the page SHALL state that the current password is required

#### Scenario: Operator enables the gate

- **WHEN** the operator enables the gate with a new password from the settings page
- **THEN** the gate SHALL become enabled
- **AND** subsequently opening a management route in a browser without a session SHALL present the unlock surface

---

### Requirement: Keep playback surfaces free of the unlock surface

Playback display routes and the offline route SHALL NOT render the unlock surface, regardless of whether the gate is enabled.

#### Scenario: Playback route renders while the gate is enabled

- **WHEN** the gate is enabled and a playback display route is opened
- **THEN** the route SHALL render its display content
- **AND** no unlock surface SHALL appear
