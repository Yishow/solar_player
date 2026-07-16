## ADDED Requirements

### Requirement: Route deployment requests by operational scope

The Pi 5 deployment skill SHALL classify each request as an application update or full deployment before executing target changes.

#### Scenario: Current code changes are sent to a test Pi

- **WHEN** the operator asks to deploy the current worktree or current code changes to an already-installed test Pi without host-level changes
- **THEN** the skill selects app scope
- **AND** requires local build or verification appropriate to the requested test update
- **AND** requires verified backup, release identity, service, `/health`, and recovery evidence
- **AND** does not require desktop installation, full kiosk verification, or reboot
- **AND** reports `sourceDirty=true` when the deployed worktree is dirty

#### Scenario: Host-level deployment is requested

- **WHEN** the request includes init, OS packages, disk, desktop, kiosk, systemd unit, boot, fan, hotspot, readonly-root, kernel, or recovery changes
- **THEN** the skill selects full scope
- **AND** requires all applicable host, kiosk, network, thermal, reboot, and rollback gates

#### Scenario: Scope is ambiguous

- **WHEN** changed files or requested behavior can affect host configuration and the safe scope cannot be established
- **THEN** the skill selects full scope or asks the operator before mutation
- **AND** never silently runs full deployment while claiming an app update
