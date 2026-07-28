## ADDED Requirements

### Requirement: Provide a Pi thin-kiosk installer that produces a browser-only kiosk

The repository SHALL provide a thin-kiosk installer (`deploy/install-thin-kiosk.sh`) that turns a Raspberry Pi 5 into a browser-only kiosk pointing at a remote server URL. The installer SHALL accept a kiosk URL argument and render it into the Firefox kiosk autostart so that on boot the Pi opens the remote server's overview page. The installer SHALL reuse the existing `deploy/start-solar-kiosk.sh`, which already supports `KIOSK_URL` and `KIOSK_HEALTH_URL` environment variable overrides, and SHALL NOT modify that launcher script.

#### Scenario: Operator installs a thin kiosk pointing at a remote server

- **WHEN** an operator runs `install-thin-kiosk.sh --kiosk-url http://<PC_IP>:3000/overview --kiosk-user <u>`
- **THEN** the Pi is configured with a Firefox kiosk autostart that opens the given URL on login
- **AND** the kiosk launcher waits for the remote server health endpoint before launching Firefox

#### Scenario: Pi reboots into the browser kiosk

- **WHEN** the Pi reboots after a thin-kiosk install
- **THEN** it auto-logs in to the desktop session
- **AND** Firefox launches in kiosk mode at the remote server overview URL
- **AND** the five playback pages are reachable from the Pi browser

### Requirement: The thin kiosk SHALL NOT run the local Solar Player server

The thin-kiosk installer SHALL NOT install the `solar-display.service` systemd unit, SHALL NOT depend on node or pnpm being present, and SHALL NOT require a local SQLite database. If the installer detects an existing `solar-display.service`, it SHALL warn and require an explicit operator decision rather than silently removing it.

#### Scenario: Fresh thin-kiosk install carries no local server

- **WHEN** the thin-kiosk installer completes on a Pi with no prior installation
- **THEN** no `solar-display.service` unit exists
- **AND** the Pi does not require node or pnpm to boot into the kiosk

#### Scenario: Existing co-located service is not silently removed

- **GIVEN** a Pi already running the co-located `solar-display.service`
- **WHEN** the thin-kiosk installer runs
- **THEN** it reports the existing service and requires an explicit operator decision before proceeding

### Requirement: The thin kiosk SHALL retain kiosk hardening

The thin-kiosk installer SHALL retain the existing kiosk hardening: the graphical desktop stack (XFCE, lightdm, Firefox, fonts, xrandr/xset), desktop autologin for the kiosk user, disabled display sleep and screen saver, Pi 5 fan control, and optional readonly root. For a fresh Pi that lacks the desktop stack, the installer SHALL install it via the existing `deploy/configure-lightweight-desktop.sh` (used as-is, not modified); for a Pi migrated from co-located mode the desktop stack is already present. Because the existing `deploy/verify-kiosk-install.sh` hard-requires an active `solar-display.service` and `/data` runtime paths, the thin kiosk SHALL be verified by a new dedicated verifier instead (see "Provide a thin-kiosk verifier").

#### Scenario: Hardening is verified after thin-kiosk install and reboot

- **WHEN** the Pi reboots after a thin-kiosk install
- **THEN** the thin-kiosk verifier reports autologin, no-sleep, fan control, and the desktop stack as healthy
- **AND** `uptime -s` confirms the Pi actually rebooted

### Requirement: Provide a thin-kiosk verifier

The repository SHALL provide `deploy/verify-thin-kiosk.sh` that verifies a thin kiosk WITHOUT requiring `solar-display.service` to be active or `/data/solar-display` runtime paths to exist. It SHALL check: the Firefox kiosk autostart points at the configured remote server URL, the desktop stack is present, autologin/no-sleep/fan are configured, the device-agent service is active, and the readonly launchers exist. The existing `deploy/verify-kiosk-install.sh` SHALL remain unchanged and SHALL continue to be used for co-located deployments.

#### Scenario: Thin-kiosk verifier passes on a browser-only Pi

- **GIVEN** a Pi configured as a thin kiosk with no `solar-display.service` and no `/data` runtime
- **WHEN** the operator runs `verify-thin-kiosk.sh`
- **THEN** it reports the kiosk URL, desktop stack, autologin, no-sleep, fan, and device-agent as healthy
- **AND** it does not fail on the absence of `solar-display.service`

### Requirement: The thin kiosk SHALL wait for the remote server with an extended timeout

Because the remote server is not guaranteed to be running when the Pi boots, the thin-kiosk installer SHALL set an extended `KIOSK_WAIT_SECONDS` (longer than the launcher default) so the kiosk keeps waiting for the remote health endpoint. The runbook SHALL state that the server PC must be powered on before or alongside the Pi.

#### Scenario: Remote server is not yet up at Pi boot

- **GIVEN** the Pi boots before the server PC
- **WHEN** the kiosk launcher polls the remote health endpoint
- **THEN** it keeps waiting up to the extended `KIOSK_WAIT_SECONDS` before giving up

### Requirement: Support migrating an existing co-located Pi to thin-kiosk mode

The thin-kiosk installer SHALL support a migration invocation that converts a Pi already running the co-located `solar-display.service` into a thin kiosk. The migration SHALL require an explicit operator confirmation, SHALL stop and disable the old `solar-display.service` rather than deleting it, and SHALL leave the prior installation on disk so the operator can roll back by re-enabling the old service. The old `pi5-deployment` skill and its deployment machinery SHALL NOT be modified by the migration.

#### Scenario: Operator migrates an existing co-located Pi

- **GIVEN** a Pi already running the co-located `solar-display.service`
- **WHEN** an operator runs the thin-kiosk installer migration invocation with explicit confirmation
- **THEN** the installer stops and disables `solar-display.service`
- **AND** installs the thin-kiosk pointing at the remote server URL
- **AND** leaves the prior co-located installation on disk for rollback

#### Scenario: Migration preserves rollback to the old deployment

- **WHEN** a migrated Pi needs to return to co-located mode
- **THEN** the operator can re-enable and start the untouched `solar-display.service`
- **AND** the old `pi5-deployment` skill and its scripts remain usable unchanged
