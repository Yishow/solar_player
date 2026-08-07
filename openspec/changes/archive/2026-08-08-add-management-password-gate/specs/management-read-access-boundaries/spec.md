## MODIFIED Requirements

### Requirement: Restrict management-only read routes to trusted operator callers

The system SHALL apply the management trusted-origin or access-token boundary to management-only read routes that expose operator settings, diagnostics, display ops, readiness details, or device metadata. When the management password gate is enabled, these routes SHALL additionally require a valid unexpired management session, or a valid `MANAGEMENT_ACCESS_TOKEN`. When the gate is disabled, these routes SHALL behave exactly as they did before the gate existed.

#### Scenario: Untrusted caller requests management diagnostics
- **WHEN** an untrusted non-loopback caller requests a management-only read route
- **THEN** the server SHALL return an explicit denied response
- **AND** it SHALL NOT expose the full management payload

##### Example: Untrusted request to display ops is denied
- **GIVEN** the request is not from loopback, does not match a trusted management origin, and does not include a valid management access token
- **WHEN** the caller requests `GET /api/display-ops`
- **THEN** the server returns a denied response
- **AND** the response does not include the display ops summary body

#### Scenario: Trusted caller without a session is denied while the gate is enabled

- **GIVEN** the management password gate is enabled
- **WHEN** a trusted-origin caller without a valid management session requests a management-only read route
- **THEN** the server SHALL return an explicit denied response
- **AND** it SHALL NOT expose the management payload

---

### Requirement: Preserve playback-safe runtime reads under hardened management boundaries

The system SHALL keep a playback-safe read contract for formal display runtime callers when the caller only needs active brand, MQTT connection status, or other runtime-safe bootstrap data. Enabling the management password gate SHALL NOT restrict these playback-safe reads.

#### Scenario: Playback runtime hydrates without management credentials
- **WHEN** a playback route loads its public runtime bootstrap data without management credentials
- **THEN** the runtime SHALL receive the minimal safe payload it needs
- **AND** the call SHALL NOT require a trusted management origin only to render the public playback surface

##### Example: Header brand bootstrap stays available
- **GIVEN** a playback page is rendering on a non-management display surface
- **WHEN** the header requests the active runtime brand payload
- **THEN** the API returns the active brand fields needed by the playback shell
- **AND** it does not expose the full management profile list

#### Scenario: Playback-safe reads survive an enabled password gate

- **GIVEN** the management password gate is enabled and the caller holds no management session
- **WHEN** a playback route loads its playback-safe runtime bootstrap data
- **THEN** the runtime SHALL receive the same payload it receives while the gate is disabled
