## ADDED Requirements

### Requirement: Issue short-lived single-use Pairing Tokens

A trusted management caller SHALL be able to issue a Pairing Token for an existing Device. The token SHALL expire 15 minutes after issuance, SHALL be consumable once, SHALL appear in plaintext only in the creation response, and SHALL be stored only as a SHA-256 hash.

#### Scenario: Consume a valid token once

- **WHEN** a Client exchanges a valid unexpired unused token for its target Device
- **THEN** the system marks the token used and issues exactly one Device Credential
- **AND** a second exchange of the same token returns 409 with code pairing_token_used

##### Example: token boundary states

| Token state | Exchange result |
| --- | --- |
| unused and age 14 minutes 59 seconds | credential issued |
| unused and age 15 minutes | pairing_token_expired |
| used | pairing_token_used |
| unknown token hash | pairing_token_invalid |

#### Scenario: Open the one-time browser pairing path

- **WHEN** a thin kiosk opens the issued `/device-pairing#token=<token>` path
- **THEN** the URL fragment SHALL NOT be sent in the HTTP request, Server log, or Referer
- **AND** the landing page SHALL clear the fragment before exchanging the token through the same-origin POST endpoint
- **AND** a successful exchange SHALL redirect the Browser to `/overview`

### Requirement: Store and deliver opaque Device Credentials safely

A Device Credential SHALL be an opaque secret stored only as a SHA-256 hash. A successful exchange SHALL set cookie solar_device_credential with HttpOnly, SameSite=Lax, Path=/, and Max-Age=31536000. Remote exchange SHALL require HTTPS and set Secure; plain HTTP exchange SHALL be allowed only from loopback development requests. When TLS terminates at a reverse proxy, Server SHALL trust forwarded protocol only from explicitly configured proxy IPs.

#### Scenario: Browser JavaScript receives the exchange response

- **WHEN** a Client successfully exchanges a Pairing Token
- **THEN** the response body and logs SHALL NOT contain the Device Credential
- **AND** the credential SHALL be available only through the HttpOnly cookie

#### Scenario: Remote Browser exchanges through a trusted HTTPS proxy

- **WHEN** a remote Browser exchanges through an explicitly trusted proxy that reports HTTPS
- **THEN** the exchange succeeds and the Device Credential Cookie has Secure
- **AND** an untrusted caller cannot spoof forwarded HTTPS
- **AND** remote plain HTTP returns pairing_https_required without consuming the token

### Requirement: Revalidate and revoke credentials

Every authenticated Device context SHALL validate the credential hash, expiry, revocation state, Device enabled state, and Group enabled state. Successful re-pairing SHALL revoke the previously active credential before the new credential becomes active.

#### Scenario: Read back the paired Device identity

- **WHEN** a paired Browser requests the Device pairing status with its HttpOnly Cookie
- **THEN** the system returns paired, deviceId, and clientId for that Device only
- **AND** a missing Cookie returns credential_missing without falling back to an anonymous Device
- **AND** success and error responses set Cache-Control no-store

#### Scenario: Disabled Device presents an otherwise valid credential

- **WHEN** a disabled Device sends a request with an unexpired unrevoked credential
- **THEN** the system rejects formal playback context with code device_disabled

#### Scenario: Stored expiry is malformed

- **WHEN** a stored Pairing Token or Device Credential expiry cannot be parsed
- **THEN** validation fails closed as expired instead of granting an unbounded lifetime

#### Scenario: Re-pair a Device

- **WHEN** a new Pairing Token for a Device is exchanged successfully
- **THEN** the prior credential SHALL fail subsequent authentication
- **AND** the newly issued credential SHALL authenticate the Device
