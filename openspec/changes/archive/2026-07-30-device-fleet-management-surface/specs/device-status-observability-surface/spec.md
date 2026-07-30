## ADDED Requirements

### Requirement: Show stable Device identity and duplicate connection diagnostics

Device Status SHALL present Device Identity, Group, Site Scope, connection count, and duplicate identity state alongside route, page, playback, and last seen diagnostics.

#### Scenario: Device has a sustained different-source duplicate

- **WHEN** the liveness snapshot reports duplicateIdentity=true
- **THEN** Device Status displays a warning tied to the stable clientId
- **AND** it does not expose the Device Credential or raw source address
