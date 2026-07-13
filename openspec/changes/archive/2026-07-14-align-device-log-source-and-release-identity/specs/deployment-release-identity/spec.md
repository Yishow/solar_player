## ADDED Requirements

### Requirement: Deployment produces an immutable release manifest

Every production bundle SHALL contain a release manifest with releaseId, commit, builtAt, packageVersion, schemaVersion, and sourceDirty fields.

#### Scenario: Clean production bundle is built

- **WHEN** a production bundle is created from a clean commit
- **THEN** commit contains the full source commit identifier
- **AND** builtAt is an ISO 8601 timestamp
- **AND** packageVersion matches the server package version
- **AND** schemaVersion matches the highest bundled database migration
- **AND** sourceDirty is false

### Requirement: Runtime reports release identity without deep health work

The trusted device status response SHALL include the loaded release manifest or an explicit unavailable reason. The health endpoint SHALL NOT read or validate the manifest.

#### Scenario: Device Status reads a deployed manifest

- **WHEN** a trusted caller requests device status on a deployed bundle
- **THEN** the response release object matches the installed manifest
- **AND** the Device Status surface renders releaseId, commit, build time, package version, and schema version

#### Scenario: Manifest is missing

- **WHEN** the runtime cannot read a valid release manifest
- **THEN** device status reports release identity as unavailable with a bounded reason
- **AND** the server remains healthy
