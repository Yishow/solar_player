## MODIFIED Requirements

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
- **AND** the client application SHALL render a dedicated standalone setup page at `/device-pairing`
- **AND** the landing page SHALL clear the fragment from the browser address bar before exchanging the token through the same-origin POST endpoint
- **AND** a successful exchange SHALL redirect the Browser to `/overview`

#### Scenario: Open the pairing path without fragment token

- **WHEN** a browser opens `/device-pairing` without a fragment token
- **THEN** the page SHALL query `/api/device-pairing/status` to determine whether the device is already paired
- **AND** when already paired, the page SHALL display the paired device identity and a navigation control to `/overview`
- **AND** when unpaired, the page SHALL display a modern manual token input interface that does not require a management password
- **AND** submitting a valid token SHALL trigger the exchange and redirect the Browser to `/overview`

#### Scenario: Pairing token exchange fails

- **WHEN** an exchange fails due to an expired, used, or invalid token
- **THEN** the page SHALL display a localized error message explaining the failure reason
- **AND** the page SHALL allow the operator to retry or paste a new token without leaving `/device-pairing`
