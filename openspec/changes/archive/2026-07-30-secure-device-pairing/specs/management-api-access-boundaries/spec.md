## ADDED Requirements

### Requirement: Protect Device pairing administration with the management mutation boundary

Pairing Token issuance, credential revocation, and re-pair actions SHALL require the existing trusted management mutation classification. The public token exchange endpoint SHALL accept only the opaque token and SHALL NOT expose Device administration data.

#### Scenario: Untrusted caller issues a Pairing Token

- **WHEN** an untrusted remote or playback caller requests a Pairing Token
- **THEN** the system rejects the request with the existing management access denied envelope
- **AND** no token row is created
