## ADDED Requirements

### Requirement: Store the management password with a slow key derivation function

The system SHALL store the management password only as a derived hash produced by a slow key derivation function with a per-password random salt. The system SHALL NOT store, log, or return the plaintext password, the derived hash, or the salt to any caller. Password comparison SHALL use a constant-time equality check. The key derivation parameters SHALL be stored alongside the hash so that stored passwords remain verifiable after the parameters are changed.

#### Scenario: The same password produces different stored hashes

- **WHEN** the same password text is set twice, each time with a newly generated salt
- **THEN** the two stored hashes SHALL differ
- **AND** both SHALL verify successfully against that password text

#### Scenario: Stored secrets are never returned

- **WHEN** any management password endpoint returns a response
- **THEN** the response SHALL NOT contain the plaintext password, the derived hash, the salt, or a session token

---

### Requirement: Gate management access on a valid management session when enabled

When the management password gate is enabled, the system SHALL require both the existing management origin trust decision and a valid unexpired management session before granting management access. When the gate is disabled, the management access decision SHALL be identical to the decision made without this capability.

A request carrying a valid `MANAGEMENT_ACCESS_TOKEN` SHALL satisfy the password gate condition without a management session.

A request that fails the password gate SHALL receive the existing management access denied envelope and SHALL NOT receive any management payload. A missing session, an unparseable session, and an expired session SHALL be answered identically so the response does not reveal which case occurred.

#### Scenario: Gate disabled preserves existing behavior

- **WHEN** the management password gate is disabled and a trusted-origin caller requests a management route
- **THEN** the caller SHALL be granted management access exactly as before this capability existed

#### Scenario: Gate enabled denies a trusted origin without a session

- **WHEN** the management password gate is enabled and a trusted-origin caller without a management session requests a management route
- **THEN** the server SHALL return the management access denied envelope
- **AND** the response SHALL NOT include any management payload

#### Scenario: Gate enabled admits a trusted origin holding a valid session

- **WHEN** the management password gate is enabled and a trusted-origin caller presents a valid unexpired management session
- **THEN** the server SHALL grant management access

#### Scenario: Management access token satisfies the gate

- **WHEN** the management password gate is enabled and a caller presents a valid `MANAGEMENT_ACCESS_TOKEN`
- **THEN** the server SHALL grant management access without requiring a management session

##### Example: Management access decision by condition

| Gate enabled | Origin trusted | Valid session | Valid access token | Management access |
| ------------ | -------------- | ------------- | ------------------ | ----------------- |
| no | no | no | no | denied |
| no | yes | no | no | granted |
| yes | yes | no | no | denied |
| yes | yes | yes | no | granted |
| yes | no | yes | no | denied |
| yes | no | no | yes | granted |

---

### Requirement: Issue and revoke opaque management sessions

On successful password verification the system SHALL generate a high-entropy random session token, store only its hash with an explicit expiry, and deliver the token to the browser as an HttpOnly cookie. An expired session SHALL NOT grant management access.

Changing the password, disabling the gate, and recovering through the management access token SHALL each invalidate every existing management session.

#### Scenario: Expired session no longer grants access

- **WHEN** a management session has passed its expiry time and its holder requests a management route while the gate is enabled
- **THEN** the server SHALL deny management access

#### Scenario: Password change invalidates existing sessions

- **GIVEN** two browsers each hold a valid management session
- **WHEN** the password is changed from one of them
- **THEN** both sessions SHALL stop granting management access
- **AND** both browsers SHALL require unlocking again

#### Scenario: Locking clears the current session

- **WHEN** a caller with a valid management session requests to lock
- **THEN** the server SHALL invalidate that session and clear its cookie
- **AND** subsequent management requests from that browser SHALL be denied while the gate is enabled

---

### Requirement: Limit repeated password attempts

The system SHALL count consecutive failed password attempts on the server. Once the count reaches a fixed threshold, the system SHALL refuse unlock requests until a fixed cooldown has elapsed, including requests that carry the correct password. A successful unlock SHALL reset the count to zero.

#### Scenario: Threshold reached starts a cooldown

- **WHEN** consecutive failed password attempts reach the threshold
- **THEN** the system SHALL refuse further unlock attempts until the cooldown has elapsed
- **AND** the refusal SHALL report the locked state and the time at which it ends

#### Scenario: Correct password is refused during cooldown

- **WHEN** the correct password is submitted while the cooldown is in effect
- **THEN** the system SHALL refuse the unlock
- **AND** the system SHALL NOT issue a management session

#### Scenario: Successful unlock resets the counter

- **GIVEN** some failed attempts have been recorded but the threshold was not reached
- **WHEN** the correct password is submitted
- **THEN** the system SHALL issue a management session
- **AND** the consecutive failure count SHALL return to zero

---

### Requirement: Expose management password gate operations over an API

The system SHALL expose API operations that enable the gate with a new password, disable the gate, change the password, unlock, lock, and read the gate state. Enabling the gate SHALL require a new password in the same request. Changing the password from an unlocked session SHALL require the current password. A caller presenting a valid `MANAGEMENT_ACCESS_TOKEN` SHALL be able to reset the password or disable the gate without knowing the current password.

The gate state SHALL be readable without a management session so a caller can decide whether an unlock is required, and that state SHALL NOT include any stored secret or the failure count.

#### Scenario: Enabling without a new password is rejected

- **WHEN** a request enables the gate without providing a new password
- **THEN** the server SHALL reject the request
- **AND** the stored gate configuration SHALL remain unchanged

#### Scenario: Changing the password requires the current password

- **WHEN** an unlocked caller submits a new password without the correct current password
- **THEN** the server SHALL reject the request
- **AND** the stored password SHALL remain unchanged

#### Scenario: Management access token recovers a forgotten password

- **WHEN** a caller presenting a valid `MANAGEMENT_ACCESS_TOKEN` sets a new password or disables the gate without supplying the current password
- **THEN** the server SHALL apply the change
- **AND** every existing management session SHALL be invalidated

#### Scenario: Gate state is readable while locked

- **WHEN** a caller without a management session reads the gate state while the gate is enabled
- **THEN** the response SHALL report that the gate is enabled and that the caller is not authenticated
- **AND** the response SHALL NOT include the hash, the salt, a session token, or the failure count

---

### Requirement: Leave playback surfaces outside the management password gate

The management password gate SHALL NOT apply to playback display routes, the offline route, display client runtime APIs, or display client socket connections. Enabling the gate SHALL NOT change any playback behavior.

#### Scenario: Display client runtime stays available while the gate is enabled

- **WHEN** the management password gate is enabled and a paired display client requests its runtime data and establishes its socket connection
- **THEN** both SHALL succeed exactly as they do while the gate is disabled

#### Scenario: Playback routes render while the gate is enabled

- **WHEN** the management password gate is enabled and a playback display route is opened
- **THEN** the route SHALL render without presenting an unlock surface
