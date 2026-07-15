## ADDED Requirements

### Requirement: Resolve the Raspberry Pi connection target at operation time

The deployment documentation SHALL treat the SSH target supplied by the operator for the current operation as the sole connection target and SHALL NOT persist a project Raspberry Pi fixed IP in SSH, deployment, RDP, health-check, or reboot-verification examples.

#### Scenario: Operator prepares an SSH deployment session

- **WHEN** an operator follows the Raspberry Pi deployment documentation
- **THEN** the documentation instructs the operator to set a `<pi-host>` or `<ssh-target>` placeholder from the IP address or MagicDNS name supplied for that operation
- **AND** subsequent SSH, one-key deployment, RDP, health, and reboot-verification commands reuse that selected target

#### Scenario: Target address changes between operations

- **WHEN** the Raspberry Pi receives a different LAN or Tailscale address
- **THEN** the operator changes only the operation-time target value
- **AND** no repository documentation edit is required

#### Scenario: Documentation retains non-target infrastructure addresses

- **WHEN** deployment documentation includes an address for a separate dependency such as the MQTT broker
- **THEN** that address is explicitly identified as dependency configuration rather than the Raspberry Pi SSH target
- **AND** it is not reused as an SSH, RDP, health, or reboot-verification target

### Requirement: Include Pi 5 thermal configuration in kiosk installation

The kiosk installation flow SHALL invoke the Pi 5 fan configuration helper before final kiosk verification and SHALL package that helper in every deploy bundle that supports Raspberry Pi kiosk installation.

#### Scenario: One-key deployment installs the thermal profile

- **WHEN** the one-key deployment reaches kiosk installation on Raspberry Pi 5
- **THEN** the installer invokes the packaged fan configuration helper
- **AND** helper failure stops installation before final verification is reported as successful

#### Scenario: Deploy bundle is built

- **WHEN** a deploy bundle is assembled
- **THEN** it contains the executable Pi 5 fan configuration helper
- **AND** bundle validation fails if the helper is missing
