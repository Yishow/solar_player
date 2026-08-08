## MODIFIED Requirements

### Requirement: Issue and revoke opaque management sessions

On successful password verification the system SHALL generate a high-entropy random session token, store only its hash with an explicit expiry, and deliver the token to the browser as an HttpOnly cookie. An expired session SHALL NOT grant management access.

The cookie's `SameSite` attribute SHALL be derived from the request that the session was issued to, so that a management origin the server already trusts is able to return the cookie. The attribute SHALL be `Strict` when the unlock request carries no `Origin` header or an `Origin` whose host equals the request host. The attribute SHALL be `None` together with `Secure` when the unlock request carries an `Origin` whose host differs from the request host and the connection is secure. When the origin host differs but the connection is not secure, the attribute SHALL remain `Strict` and the server SHALL log a warning naming that origin, because no attribute combination can deliver the cookie in that case.

Clearing the session cookie SHALL use the same attributes that were used to set it, so that the cleared cookie replaces the stored one rather than leaving it behind.

Cross-origin responses to management origins the server already allows SHALL permit credentials, so that a browser is not blocked from sending or storing the session cookie on those requests. The set of allowed origins SHALL NOT change as a result.

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

#### Scenario: Same-host management origin receives a strictly scoped session cookie

- **WHEN** a caller whose `Origin` host equals the request host unlocks successfully
- **THEN** the session cookie SHALL carry `SameSite=Strict`
- **AND** the cookie SHALL NOT carry `SameSite=None`

#### Scenario: Cross-host management origin over a secure connection receives a usable session cookie

- **GIVEN** the gate is enabled and a management origin on a different host is configured as trusted
- **WHEN** a caller from that origin unlocks successfully over a secure connection
- **THEN** the session cookie SHALL carry `SameSite=None` together with `Secure`
- **AND** a subsequent management request from that origin carrying the cookie SHALL satisfy the gate

#### Scenario: Cross-host management origin over an insecure connection is reported rather than silently broken

- **WHEN** a caller whose `Origin` host differs from the request host unlocks successfully over a connection that is not secure
- **THEN** the session cookie SHALL carry `SameSite=Strict`
- **AND** the server SHALL log a warning naming that origin so an operator can see why the gate does not open

##### Example: SameSite attribute by issuing request

| Unlock request | `SameSite` | `Secure` |
| -------------- | ---------- | -------- |
| No `Origin` header | `Strict` | not required |
| `Origin` host equals request host | `Strict` | not required |
| `Origin` host differs, connection is secure | `None` | required |
| `Origin` host differs, connection is not secure | `Strict` | not required |

---

### Requirement: Expose management password gate operations over an API

The system SHALL expose API operations that enable the gate with a new password, disable the gate, change the password, unlock, lock, and read the gate state. Enabling the gate SHALL require a new password in the same request. Changing the password from an unlocked session SHALL require the current password. A caller presenting a valid `MANAGEMENT_ACCESS_TOKEN` SHALL be able to reset the password or disable the gate without knowing the current password.

Because verifying the current password during a password change advances the same failure count and cooldown as an unlock attempt, the password change operation SHALL report a cooldown the same way the unlock operation does: while the cooldown is in effect it SHALL report that the caller is locked out and SHALL report when the cooldown ends, rather than reporting a failed password. A password that is simply wrong SHALL continue to be reported as a failed authentication.

The gate state SHALL be readable without a management session so a caller can decide whether an unlock is required, and that state SHALL NOT include any stored secret or the failure count.

#### Scenario: Enabling without a new password is rejected

- **WHEN** a request enables the gate without providing a new password
- **THEN** the server SHALL reject the request
- **AND** the stored gate configuration SHALL remain unchanged

#### Scenario: Changing the password requires the current password

- **WHEN** an unlocked caller submits a new password without the correct current password
- **THEN** the server SHALL reject the request
- **AND** the stored password SHALL remain unchanged

#### Scenario: Changing the password during a cooldown reports the lockout

- **GIVEN** repeated failed password attempts have started a cooldown
- **WHEN** a caller submits a password change with the correct current password before the cooldown ends
- **THEN** the server SHALL report that the caller is locked out and SHALL report when the cooldown ends
- **AND** the server SHALL NOT report the request as a failed password
- **AND** the stored password SHALL remain unchanged

#### Scenario: Management access token recovers a forgotten password

- **WHEN** a caller presenting a valid `MANAGEMENT_ACCESS_TOKEN` sets a new password or disables the gate without supplying the current password
- **THEN** the server SHALL apply the change
- **AND** every existing management session SHALL be invalidated
- **AND** an active cooldown SHALL NOT block that caller

#### Scenario: Gate state is readable while locked

- **WHEN** a caller without a management session reads the gate state while the gate is enabled
- **THEN** the response SHALL report that the gate is enabled and that the caller is not authenticated
- **AND** the response SHALL NOT include the hash, the salt, a session token, or the failure count
