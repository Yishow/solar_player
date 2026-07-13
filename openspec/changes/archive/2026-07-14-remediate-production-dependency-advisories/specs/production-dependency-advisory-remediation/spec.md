## ADDED Requirements

### Requirement: Production dependency graph is free of known advisories

The repository SHALL resolve every production dependency to versions for which the production audit reports zero known advisories.

#### Scenario: Production audit passes after remediation

- **WHEN** the production dependency audit runs against the committed lockfile
- **THEN** it exits with status zero
- **AND** it reports no low, moderate, high, or critical advisory

### Requirement: Patched transitive resolutions are inspectable

The repository SHALL provide dependency graph evidence that every ws and react-router resolution used by production packages is outside the vulnerable ranges reported by the audit database.

#### Scenario: Operator inspects advisory-related packages

- **WHEN** the operator inspects recursive dependency reasons for ws and react-router
- **THEN** every production resolution is a patched version
- **AND** no unrelated major upgrade is required to explain the remediation

### Requirement: Advisory remediation preserves runtime integration behavior

The remediation SHALL preserve MQTT connect and publish behavior, Socket.IO connect and reconnect behavior, browser route loading, and the existing production build.

#### Scenario: Targeted and repository verification pass

- **WHEN** the MQTT, Socket.IO, and router targeted tests run followed by the repository verification entrypoint
- **THEN** every command exits with status zero
- **AND** the production build completes without a dependency-resolution regression
