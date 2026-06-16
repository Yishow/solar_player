## ADDED Requirements

### Requirement: Install Raspberry Pi kiosk runtime under the data volume

The system SHALL support Raspberry Pi kiosk installation with the application bundle, environment file, SQLite data, uploads, and logs rooted under `/data/solar-display` when `INSTALL_DIR=/data/solar-display` is provided to the kiosk installer.

#### Scenario: Installer writes service paths from the install directory

- **WHEN** the kiosk installer runs with `INSTALL_DIR=/data/solar-display` and `KIOSK_USER=kz`
- **THEN** the installed systemd service SHALL use `/data/solar-display` as its working directory
- **AND** the service environment SHALL point `DATA_DIR` and `LOG_DIR` under `/data/solar-display`
- **AND** the service writable paths SHALL include only the runtime data, log, image upload, and brand upload directories under `/data/solar-display`

#### Scenario: Runtime directories are owned by the kiosk user

- **WHEN** the kiosk installer prepares runtime directories
- **THEN** `/data/solar-display/data`, `/data/solar-display/logs`, `/data/solar-display/uploads/images`, and `/data/solar-display/uploads/brand` SHALL exist
- **AND** those directories SHALL be writable by the configured kiosk user

### Requirement: Provide a desktop re-entry launcher after kiosk exit

The system SHALL install a clickable desktop launcher named `Solar Display Kiosk` for the kiosk user, and that launcher SHALL invoke the fixed start helper used by autostart.

#### Scenario: Operator exits kiosk and returns from desktop

- **WHEN** a trusted operator exits Firefox kiosk mode through the Device Status kiosk exit action
- **THEN** the desktop session SHALL expose a clickable `Solar Display Kiosk` launcher
- **AND** activating the launcher SHALL start Firefox kiosk mode at the configured kiosk URL through the fixed start helper

#### Scenario: Launcher files are installed consistently

- **WHEN** the kiosk installer installs launcher assets for user `kz`
- **THEN** an autostart launcher SHALL exist under the user's autostart directory
- **AND** a desktop launcher SHALL exist under the user's desktop directory
- **AND** both launchers SHALL reference the configured user's start helper instead of a hard-coded unrelated path

### Requirement: Harden root filesystem writes while preserving runtime writes

The system SHALL provide an explicit read-only root hardening flow that keeps root filesystem writes minimized while preserving application runtime writes under `/data/solar-display`.

#### Scenario: Read-only hardening is applied after runtime validation

- **WHEN** the operator enables read-only root hardening
- **THEN** the hardening flow SHALL verify that `/data/solar-display` exists and is writable before applying root write restrictions
- **AND** the hardening flow SHALL preserve writes required for SQLite data, uploads, logs, and kiosk launcher state
- **AND** the hardening flow SHALL print the commands required to verify service health and kiosk re-entry after reboot

#### Scenario: Runtime write verification fails

- **WHEN** `/data/solar-display` is missing or not writable by the kiosk user
- **THEN** the hardening flow SHALL stop before changing root filesystem write behavior
- **AND** it SHALL report the missing or unwritable path that blocks safe hardening

### Requirement: Verify kiosk boot, exit, re-entry, and runtime storage

The system SHALL provide a verification command for Raspberry Pi kiosk installs that checks the app service, health endpoint, desktop launcher, autostart launcher, and runtime storage paths.

#### Scenario: Verified kiosk installation

- **WHEN** the verification command runs on the kiosk host after installation
- **THEN** it SHALL report the systemd service state
- **AND** it SHALL check the local health endpoint
- **AND** it SHALL check the autostart launcher and desktop launcher locations
- **AND** it SHALL check that the runtime SQLite directory and upload directories are under the configured install directory

#### Scenario: Verification detects missing desktop return launcher

- **WHEN** the desktop launcher is absent for the kiosk user
- **THEN** the verification command SHALL fail
- **AND** it SHALL identify the desktop launcher path that must be restored
