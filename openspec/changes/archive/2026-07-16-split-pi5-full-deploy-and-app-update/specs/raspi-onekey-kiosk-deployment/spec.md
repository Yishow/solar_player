## ADDED Requirements

### Requirement: Select application update or full deployment scope

The deployment entrypoint SHALL expose an explicit `app` or `full` scope and SHALL default update mode to `app` and init mode to `full` when the operator omits the scope.

#### Scenario: Installed application is updated with default scope

- **WHEN** an operator runs update mode without `--scope`
- **THEN** the entrypoint selects app scope
- **AND** forwards app scope to target bootstrap

#### Scenario: Fresh installation selects full scope

- **WHEN** an operator runs init mode without `--scope`
- **THEN** the entrypoint selects full scope

#### Scenario: Host option conflicts with app scope

- **WHEN** app scope is combined with init mode, readonly application, data partition creation, or hotspot policy inputs
- **THEN** the entrypoint exits nonzero before build, upload, or target mutation
- **AND** reports that full scope is required

### Requirement: Perform a minimal installed-application update

Target bootstrap SHALL provide an app scope that preserves runtime data and updates the existing application without reconfiguring the host.

#### Scenario: App update succeeds

- **WHEN** target bootstrap receives app scope for an existing installed kiosk
- **THEN** it validates the host, existing install root, `/data`, Node, pnpm, and the existing `solar-display.service`
- **AND** creates and verifies a runtime backup before bundle replacement
- **AND** preserves `.env`, SQLite data, logs, and uploads
- **AND** installs production dependencies from the uploaded bundle
- **AND** restarts the existing service
- **AND** verifies the release manifest, active service, and `/health`
- **AND** reports the backup and recovery command

#### Scenario: App update excludes host deployment actions

- **WHEN** target bootstrap runs app scope
- **THEN** it does not install OS packages or Tailscale
- **AND** does not create environment defaults or mutate disk state
- **AND** does not invoke desktop, kiosk, fan, hotspot, readonly, or full kiosk verification helpers
- **AND** does not reboot the target

#### Scenario: Existing application prerequisite is missing

- **WHEN** app scope cannot find the existing install, Node, pnpm, `/data`, or `solar-display.service`
- **THEN** it exits nonzero without silently escalating to full scope
- **AND** retains recovery material when the verified backup was already created
