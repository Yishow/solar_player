## MODIFIED Requirements

### Requirement: Provide a local Raspberry Pi kiosk deployment entrypoint

The system SHALL provide a local deployment command that targets a Raspberry Pi over SSH, builds or selects a deploy bundle, uploads the bundle, invokes target-side bootstrap, protects existing runtime state before an update, applies an operation-selected hotspot policy when requested, restarts the service, and reports verification and recovery results.

#### Scenario: Operator starts an update deployment

- **WHEN** an operator runs the Raspberry Pi deployment entrypoint with the operation-time `SSH_TARGET` in update mode
- **THEN** the command verifies SSH reachability and sudo access before uploading files
- **AND** it prints the target, mode, install directory, bundle type, MQTT host setting, readonly-root setting, and hotspot policy inputs before making target changes
- **AND** it prints the kiosk user derived from the SSH target or explicit override before making target changes
- **AND** target-side bootstrap stops the active service and creates a verified runtime backup before replacing application files
- **AND** a backup failure stops the update before application replacement
- **AND** it forwards the hotspot connection id, scan SSID, and integer priority to target bootstrap when hotspot management is requested
- **AND** the final output reports the backup path and recovery command

#### Scenario: Dry run reports planned stages without target changes

- **WHEN** an operator runs the deployment entrypoint with dry-run enabled
- **THEN** the command prints the local and remote stages that would run, including backup verification, hotspot policy configuration when requested, and recovery handoff
- **AND** it does not upload a bundle, create a backup, install packages, change NetworkManager profiles, install or enable systemd units, restart services, edit partitions, or enable readonly root
