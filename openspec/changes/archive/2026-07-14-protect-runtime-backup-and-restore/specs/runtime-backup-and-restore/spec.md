## ADDED Requirements

### Requirement: Update deployment requires a verified runtime backup

An update deployment SHALL stop the solar-display service when active, create a runtime archive before replacing application files, and fail closed when the archive cannot be verified.

#### Scenario: Backup creation fails

- **WHEN** archive creation, manifest generation, or checksum verification fails
- **THEN** the update exits nonzero before replacing application files
- **AND** the existing install remains available for operator recovery

### Requirement: Runtime archive is secret-safe and self-describing

Each runtime archive SHALL contain the existing data, uploads, and .env entries that are present, plus a manifest with creation time, source release identity, schema versions, included paths, and cryptographic checksums. The archive file SHALL use mode 0600 and its containing backup directory SHALL use mode 0700.

#### Scenario: Archive contains an environment file

- **WHEN** .env exists in the install root during backup
- **THEN** the archive manifest marks the archive as containing secrets
- **AND** the archive is unreadable by group and other users

### Requirement: Restore helper verifies before replacing state

The restore helper SHALL accept an archive and an explicit target root, validate manifest checksums before extraction, and refuse to overwrite an install root unless the operator supplies the documented restore confirmation.

#### Scenario: Archive checksum is invalid

- **WHEN** the restore helper receives an archive whose payload does not match its manifest
- **THEN** it exits nonzero
- **AND** it writes no restored data into the target root

### Requirement: Restore drill proves database and runtime viability

A restore drill SHALL extract into a fresh temp root, open the restored SQLite database, run PRAGMA integrity_check, apply pending migrations in the temp root, and start a bounded health smoke against the restored state.

#### Scenario: Restored database is valid

- **WHEN** the restore drill runs against a verified archive
- **THEN** SQLite integrity_check returns ok
- **AND** pending migrations complete in the temp copy
- **AND** the health smoke returns the healthy response

### Requirement: Failed update preserves rollback material without destructive database rollback

The update flow SHALL retain the prior application bundle and verified runtime archive when later installation or health verification fails. It SHALL NOT automatically replace the production database with the archived copy.

#### Scenario: New service fails health verification

- **WHEN** application replacement completes but the new service fails the bounded health check
- **THEN** the update reports the prior bundle path, runtime archive path, and restore command
- **AND** the archived database is not automatically restored over production data
