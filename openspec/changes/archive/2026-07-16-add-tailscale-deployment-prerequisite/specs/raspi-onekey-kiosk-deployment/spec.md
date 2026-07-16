## ADDED Requirements

### Requirement: Install Tailscale as a standard deployment prerequisite

The Raspberry Pi one-key deployment SHALL install the Tailscale client from Tailscale's official Ubuntu stable package repository and SHALL ensure `tailscaled.service` is enabled and active before replacing application files. The prerequisite SHALL be idempotent and SHALL preserve existing Tailscale node state.

#### Scenario: Fresh supported host does not have Tailscale

- **WHEN** init or update deployment runs on a writable Ubuntu 24.04 arm64 host without the Tailscale CLI
- **THEN** bootstrap configures the official Ubuntu Noble Tailscale keyring and package source
- **AND** it installs the `tailscale` package
- **AND** it enables and starts `tailscaled.service` before application replacement

#### Scenario: Host already has a ready Tailscale installation

- **WHEN** deployment runs with the Tailscale CLI present and `tailscaled.service` enabled and active
- **THEN** the prerequisite succeeds without replacing tailnet enrollment state
- **AND** it does not invoke Tailscale login or change the node's assigned address

#### Scenario: Durable installation is blocked by readonly root

- **WHEN** Tailscale is absent or not durably enabled and the root filesystem is an active overlay
- **THEN** the prerequisite exits nonzero before application replacement
- **AND** it directs the operator to disable readonly root and reboot before retrying

#### Scenario: Package or daemon preparation fails

- **WHEN** the official keyring/source download, apt operation, or daemon enable/start operation fails
- **THEN** bootstrap exits nonzero with the failed prerequisite step
- **AND** it does not replace application files or report deployment success

#### Scenario: Dry run reports the prerequisite

- **WHEN** the operator runs one-key deployment with dry-run enabled
- **THEN** output includes the planned Tailscale install and daemon enable/start stage
- **AND** no package, repository, service, or enrollment state is changed

### Requirement: Verify local Tailscale readiness separately from tailnet enrollment

The kiosk verification command SHALL require the Tailscale CLI and an enabled and active `tailscaled.service`. Tailnet login, a Tailscale IP, and a particular backend state SHALL NOT be required by local deployment verification.

#### Scenario: Daemon is ready before enrollment

- **WHEN** verification finds the Tailscale CLI and `tailscaled.service` enabled and active while the node has no Tailscale IP
- **THEN** the Tailscale prerequisite check passes
- **AND** documentation directs the operator to complete enrollment explicitly

#### Scenario: Required local Tailscale component is unavailable

- **WHEN** the Tailscale CLI is missing, `tailscaled.service` is disabled, or `tailscaled.service` is inactive
- **THEN** verification reports the Tailscale prerequisite failure
- **AND** verification exits nonzero

#### Scenario: Operator completes enrollment

- **WHEN** the daemon is ready and the operator chooses an interactive login or externally supplied one-time enrollment method
- **THEN** no reusable auth material is read from or written to repository-managed files
- **AND** the operator uses the control-plane-assigned Tailscale IP or MagicDNS name as the operation-time SSH target
- **AND** deployment does not promise or hardcode a particular Tailscale IP
