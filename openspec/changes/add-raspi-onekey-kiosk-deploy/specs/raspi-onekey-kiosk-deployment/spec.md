## ADDED Requirements

### Requirement: Provide a local Raspberry Pi kiosk deployment entrypoint

The system SHALL provide a local deployment command that targets a Raspberry Pi over SSH, builds or selects a deploy bundle, uploads the bundle, invokes target-side bootstrap, restarts the service, and reports verification results.

#### Scenario: Operator starts an update deployment

- **WHEN** an operator runs the Raspberry Pi deployment entrypoint with a target such as `kz@192.168.31.39` in update mode
- **THEN** the command verifies SSH reachability and sudo access before uploading files
- **AND** it prints the target, mode, install directory, bundle type, MQTT host setting, and readonly-root setting before making target changes

#### Scenario: Dry run reports planned stages without target changes

- **WHEN** an operator runs the deployment entrypoint with dry-run enabled
- **THEN** the command prints the local and remote stages that would run
- **AND** it does not upload a bundle, install packages, restart services, edit partitions, or enable readonly root

### Requirement: Keep daily update deployments non-destructive

The system SHALL support a daily update mode that updates the application deployment while preserving target runtime state and without changing disk partitions.

#### Scenario: Update deployment preserves runtime state

- **WHEN** an operator runs update mode against a target with an existing install directory
- **THEN** the deployment preserves the target `.env`, data directory, logs directory, image uploads directory, and brand uploads directory
- **AND** it updates application files and deploy helpers needed by the current bundle

#### Scenario: Update mode refuses disk initialization

- **WHEN** an operator runs update mode
- **THEN** the deployment does not run disk partition creation, disk resizing, filesystem formatting, or mount table creation commands
- **AND** it fails if the required `/data` runtime mount or install directory prerequisites are missing

### Requirement: Gate new-card disk initialization behind detected layout and confirmation

The system SHALL gate new-card disk initialization behind explicit layout detection, safe-case checks, and operator confirmation.

#### Scenario: Init mode displays disk choices

- **WHEN** an operator runs init mode on a Raspberry Pi target
- **THEN** the bootstrap prints the detected disk name, total disk size, partition list, filesystem labels, mountpoints, root partition size, and `/data` mount status
- **AND** it presents root-size and `/data` layout choices before performing disk changes

#### Scenario: Existing writable data mount is reused

- **WHEN** init mode detects an existing writable `/data` mount
- **THEN** it offers to reuse `/data`
- **AND** reusing `/data` does not format, resize, or repartition the disk

#### Scenario: Root-full layout is rejected

- **WHEN** init mode detects that the root partition consumes the full disk and `/data` is absent
- **THEN** it exits non-zero with a message explaining that online root shrink is not supported
- **AND** it does not run partition shrink, filesystem shrink, formatting, or mount table modification commands

### Requirement: Install and verify kiosk runtime on Ubuntu 24.04 Raspberry Pi

The system SHALL install and verify the runtime prerequisites for the Solar Display kiosk on Ubuntu 24.04 arm64 Raspberry Pi targets.

#### Scenario: Supported host passes preflight

- **WHEN** bootstrap runs on Ubuntu 24.04 arm64 with sudo access
- **THEN** it accepts the host as a supported target
- **AND** it verifies or installs the required runtime pieces for Node, pnpm, the Solar Display service, kiosk launcher helpers, and desktop re-entry launcher

#### Scenario: Unsupported host is rejected

- **WHEN** bootstrap runs on a host that is not Ubuntu 24.04 arm64 or lacks sudo access
- **THEN** it exits non-zero before installing packages or changing service configuration
- **AND** it prints the unsupported OS, architecture, or sudo check that failed

### Requirement: Configure lightweight XFCE RDP without weakening SSH or sudo

The system SHALL support lightweight remote desktop setup with XFCE and xrdp, and RDP passwordless access SHALL NOT disable SSH password authentication or sudo password prompts.

#### Scenario: XFCE xrdp desktop is installed

- **WHEN** bootstrap runs with desktop mode set to `xfce-xrdp`
- **THEN** it verifies or installs XFCE, xrdp, xorgxrdp, and the kiosk user's XFCE session file
- **AND** it enables the xrdp service for remote desktop access

#### Scenario: RDP passwordless is limited to the kiosk desktop

- **WHEN** bootstrap runs with RDP auth mode set to `passwordless`
- **THEN** it configures xrdp to enter the kiosk user's XFCE desktop without prompting the RDP operator for a password
- **AND** it does not disable SSH password authentication
- **AND** it does not add sudo passwordless rules

#### Scenario: RDP passwordless requires a password source

- **WHEN** bootstrap runs with RDP auth mode set to `passwordless` and no kiosk password source is provided
- **THEN** it exits non-zero before changing xrdp configuration
- **AND** it explains that SSH and sudo remain password-protected

### Requirement: Preserve MQTT defaults without overwriting target configuration

The system SHALL allow first-install MQTT defaults to be supplied during deployment while preserving an existing target `.env` file.

#### Scenario: First install writes MQTT default

- **WHEN** deployment runs with an MQTT host value and the target install directory has no `.env`
- **THEN** the generated `.env` contains the supplied MQTT broker host value
- **AND** the deployment prints that it created the target `.env`

#### Scenario: Existing env is preserved

- **WHEN** deployment runs with an MQTT host value and the target install directory already has `.env`
- **THEN** the deployment preserves the existing `.env` file unchanged
- **AND** it prints that MQTT defaults were not overwritten

### Requirement: Gate readonly root apply behind successful verification

The system SHALL keep readonly root hardening as an explicit optional apply step that can run only after service and kiosk verification succeed.

#### Scenario: Readonly root defaults to dry run

- **WHEN** deployment completes without an explicit readonly apply flag
- **THEN** the deployment runs readonly-root preflight in dry-run mode or prints the readonly-root dry-run command
- **AND** it does not write overlayroot configuration or update initramfs

#### Scenario: Readonly root apply requires verification success

- **WHEN** an operator requests readonly root apply
- **THEN** the deployment first verifies the Solar Display service is active, the health endpoint responds, runtime write paths are writable by the kiosk user, and kiosk launchers are installed
- **AND** it invokes readonly root apply only if all verification checks pass

#### Scenario: Verification failure blocks readonly root apply

- **WHEN** readonly root apply is requested and any verification check fails
- **THEN** the deployment exits non-zero
- **AND** it leaves overlayroot configuration unchanged

### Requirement: Provide fixed desktop controls for readonly system maintenance

The system SHALL install fixed desktop launchers for enabling readonly system mode and temporarily disabling readonly system mode without exposing arbitrary host command execution.

#### Scenario: Desktop launchers are installed for kiosk user

- **WHEN** kiosk desktop setup completes
- **THEN** the kiosk user's desktop contains an executable launcher named `Enable Read Only System`
- **AND** it contains an executable launcher named `Temporarily Disable Read Only System`
- **AND** both launchers invoke fixed helper scripts installed under the kiosk user's bin directory

#### Scenario: Enable readonly desktop control requires sudo and verification

- **WHEN** an operator launches `Enable Read Only System`
- **THEN** the helper runs readonly-root verification before applying overlayroot
- **AND** it requires sudo for the host-level change
- **AND** it prompts the operator to reboot after a successful apply

#### Scenario: Temporarily disable readonly desktop control requires sudo and reboot

- **WHEN** an operator launches `Temporarily Disable Read Only System`
- **THEN** the helper disables overlayroot through the writable root or `overlayroot-chroot`
- **AND** it requires sudo for the host-level change
- **AND** it prompts the operator to reboot for the change to take effect
