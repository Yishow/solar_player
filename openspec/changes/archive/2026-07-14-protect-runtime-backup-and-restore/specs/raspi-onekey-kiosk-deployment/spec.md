## MODIFIED Requirements

### Requirement: Provide a local Raspberry Pi kiosk deployment entrypoint

The system SHALL provide a local deployment command that targets a Raspberry Pi over SSH, builds or selects a deploy bundle, uploads the bundle, invokes target-side bootstrap, protects existing runtime state before an update, restarts the service, and reports verification and recovery results.

#### Scenario: Operator starts an update deployment

- **WHEN** an operator runs the Raspberry Pi deployment entrypoint with a target such as `pi@<pi-ip>` or `kz@192.168.31.39` in update mode
- **THEN** the command verifies SSH reachability and sudo access before uploading files
- **AND** it prints the target, mode, install directory, bundle type, MQTT host setting, and readonly-root setting before making target changes
- **AND** it prints the kiosk user derived from the SSH target or explicit override before making target changes
- **AND** target-side bootstrap stops the active service and creates a verified runtime backup before replacing application files
- **AND** a backup failure stops the update before application replacement
- **AND** the final output reports the backup path and recovery command

#### Scenario: Dry run reports planned stages without target changes

- **WHEN** an operator runs the deployment entrypoint with dry-run enabled
- **THEN** the command prints the local and remote stages that would run, including backup verification and recovery handoff
- **AND** it does not upload a bundle, create a backup, install packages, restart services, edit partitions, or enable readonly root
