# pi-thin-kiosk-mode Specification

## Purpose

TBD - created by syncing change 'split-server-to-pc-thin-kiosk'. Update Purpose after archive.

## Requirements

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


<!-- @trace
source: split-server-to-pc-thin-kiosk
updated: 2026-07-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - scripts/build-windows-offline-bundle.mjs
  - scripts/deploy.test.mjs
  - .env.example
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - docs/runbooks/pc-server-deploy.md
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - scripts/build-windows-offline-bundle.cmd
  - apps/server/src/routes/device.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/routes/settings-mqtt.ts
  - scripts/build-windows-offline-bundle.sh
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - docs/ops/conventions.md
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/index.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - deploy/install-thin-kiosk.sh
  - deploy/windows-offline/Start-SolarPlayer.cmd
  - packages/shared/src/playbackMetricContract.ts
  - apps/server/src/services/displayStoryService.ts
  - .agents/skills/split-deployment/SKILL.md
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - deploy/windows-offline/Install-SolarPlayer.ps1
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/config.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - deploy/solar-device-agent.py
  - deploy/solar-device-agent.service
  - deploy/windows-offline/Manage-SolarPlayer.ps1
  - apps/web/src/pages/Overview/viewModel.ts
tests:
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/config.test.ts
-->

---
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


<!-- @trace
source: split-server-to-pc-thin-kiosk
updated: 2026-07-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - scripts/build-windows-offline-bundle.mjs
  - scripts/deploy.test.mjs
  - .env.example
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - docs/runbooks/pc-server-deploy.md
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - scripts/build-windows-offline-bundle.cmd
  - apps/server/src/routes/device.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/routes/settings-mqtt.ts
  - scripts/build-windows-offline-bundle.sh
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - docs/ops/conventions.md
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/index.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - deploy/install-thin-kiosk.sh
  - deploy/windows-offline/Start-SolarPlayer.cmd
  - packages/shared/src/playbackMetricContract.ts
  - apps/server/src/services/displayStoryService.ts
  - .agents/skills/split-deployment/SKILL.md
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - deploy/windows-offline/Install-SolarPlayer.ps1
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/config.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - deploy/solar-device-agent.py
  - deploy/solar-device-agent.service
  - deploy/windows-offline/Manage-SolarPlayer.ps1
  - apps/web/src/pages/Overview/viewModel.ts
tests:
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/config.test.ts
-->

---
### Requirement: The thin kiosk SHALL retain kiosk hardening

The thin-kiosk installer SHALL retain the existing kiosk hardening: the graphical desktop stack (XFCE, lightdm, Firefox, fonts, xrandr/xset), desktop autologin for the kiosk user, disabled display sleep and screen saver, Pi 5 fan control, and optional readonly root. For a fresh Pi that lacks the desktop stack, the installer SHALL install it via the existing `deploy/configure-lightweight-desktop.sh` (used as-is, not modified); for a Pi migrated from co-located mode the desktop stack is already present. Because the existing `deploy/verify-kiosk-install.sh` hard-requires an active `solar-display.service` and `/data` runtime paths, the thin kiosk SHALL be verified by a new dedicated verifier instead (see "Provide a thin-kiosk verifier").

#### Scenario: Hardening is verified after thin-kiosk install and reboot

- **WHEN** the Pi reboots after a thin-kiosk install
- **THEN** the thin-kiosk verifier reports autologin, no-sleep, fan control, and the desktop stack as healthy
- **AND** `uptime -s` confirms the Pi actually rebooted


<!-- @trace
source: split-server-to-pc-thin-kiosk
updated: 2026-07-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - scripts/build-windows-offline-bundle.mjs
  - scripts/deploy.test.mjs
  - .env.example
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - docs/runbooks/pc-server-deploy.md
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - scripts/build-windows-offline-bundle.cmd
  - apps/server/src/routes/device.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/routes/settings-mqtt.ts
  - scripts/build-windows-offline-bundle.sh
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - docs/ops/conventions.md
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/index.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - deploy/install-thin-kiosk.sh
  - deploy/windows-offline/Start-SolarPlayer.cmd
  - packages/shared/src/playbackMetricContract.ts
  - apps/server/src/services/displayStoryService.ts
  - .agents/skills/split-deployment/SKILL.md
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - deploy/windows-offline/Install-SolarPlayer.ps1
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/config.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - deploy/solar-device-agent.py
  - deploy/solar-device-agent.service
  - deploy/windows-offline/Manage-SolarPlayer.ps1
  - apps/web/src/pages/Overview/viewModel.ts
tests:
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/config.test.ts
-->

---
### Requirement: Provide a thin-kiosk verifier

The repository SHALL provide `deploy/verify-thin-kiosk.sh` that verifies a thin kiosk WITHOUT requiring `solar-display.service` to be active or `/data/solar-display` runtime paths to exist. It SHALL check: the Firefox kiosk autostart points at the configured remote server URL, the desktop stack is present, autologin/no-sleep/fan are configured, the device-agent service is active, and the readonly launchers exist. The existing `deploy/verify-kiosk-install.sh` SHALL remain unchanged and SHALL continue to be used for co-located deployments.

#### Scenario: Thin-kiosk verifier passes on a browser-only Pi

- **GIVEN** a Pi configured as a thin kiosk with no `solar-display.service` and no `/data` runtime
- **WHEN** the operator runs `verify-thin-kiosk.sh`
- **THEN** it reports the kiosk URL, desktop stack, autologin, no-sleep, fan, and device-agent as healthy
- **AND** it does not fail on the absence of `solar-display.service`


<!-- @trace
source: split-server-to-pc-thin-kiosk
updated: 2026-07-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - scripts/build-windows-offline-bundle.mjs
  - scripts/deploy.test.mjs
  - .env.example
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - docs/runbooks/pc-server-deploy.md
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - scripts/build-windows-offline-bundle.cmd
  - apps/server/src/routes/device.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/routes/settings-mqtt.ts
  - scripts/build-windows-offline-bundle.sh
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - docs/ops/conventions.md
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/index.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - deploy/install-thin-kiosk.sh
  - deploy/windows-offline/Start-SolarPlayer.cmd
  - packages/shared/src/playbackMetricContract.ts
  - apps/server/src/services/displayStoryService.ts
  - .agents/skills/split-deployment/SKILL.md
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - deploy/windows-offline/Install-SolarPlayer.ps1
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/config.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - deploy/solar-device-agent.py
  - deploy/solar-device-agent.service
  - deploy/windows-offline/Manage-SolarPlayer.ps1
  - apps/web/src/pages/Overview/viewModel.ts
tests:
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/config.test.ts
-->

---
### Requirement: The thin kiosk SHALL wait for the remote server with an extended timeout

Because the remote server is not guaranteed to be running when the Pi boots, the thin-kiosk installer SHALL set an extended `KIOSK_WAIT_SECONDS` (longer than the launcher default) so the kiosk keeps waiting for the remote health endpoint. The runbook SHALL state that the server PC must be powered on before or alongside the Pi.

#### Scenario: Remote server is not yet up at Pi boot

- **GIVEN** the Pi boots before the server PC
- **WHEN** the kiosk launcher polls the remote health endpoint
- **THEN** it keeps waiting up to the extended `KIOSK_WAIT_SECONDS` before giving up


<!-- @trace
source: split-server-to-pc-thin-kiosk
updated: 2026-07-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - scripts/build-windows-offline-bundle.mjs
  - scripts/deploy.test.mjs
  - .env.example
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - docs/runbooks/pc-server-deploy.md
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - scripts/build-windows-offline-bundle.cmd
  - apps/server/src/routes/device.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/routes/settings-mqtt.ts
  - scripts/build-windows-offline-bundle.sh
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - docs/ops/conventions.md
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/index.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - deploy/install-thin-kiosk.sh
  - deploy/windows-offline/Start-SolarPlayer.cmd
  - packages/shared/src/playbackMetricContract.ts
  - apps/server/src/services/displayStoryService.ts
  - .agents/skills/split-deployment/SKILL.md
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - deploy/windows-offline/Install-SolarPlayer.ps1
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/config.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - deploy/solar-device-agent.py
  - deploy/solar-device-agent.service
  - deploy/windows-offline/Manage-SolarPlayer.ps1
  - apps/web/src/pages/Overview/viewModel.ts
tests:
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/config.test.ts
-->

---
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

<!-- @trace
source: split-server-to-pc-thin-kiosk
updated: 2026-07-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - scripts/build-windows-offline-bundle.mjs
  - scripts/deploy.test.mjs
  - .env.example
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - docs/runbooks/pc-server-deploy.md
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - scripts/build-windows-offline-bundle.cmd
  - apps/server/src/routes/device.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/routes/settings-mqtt.ts
  - scripts/build-windows-offline-bundle.sh
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - docs/ops/conventions.md
  - deploy/verify-thin-kiosk.sh
  - packages/shared/src/index.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - deploy/install-thin-kiosk.sh
  - deploy/windows-offline/Start-SolarPlayer.cmd
  - packages/shared/src/playbackMetricContract.ts
  - apps/server/src/services/displayStoryService.ts
  - .agents/skills/split-deployment/SKILL.md
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - deploy/windows-offline/Install-SolarPlayer.ps1
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/config.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - deploy/solar-device-agent.py
  - deploy/solar-device-agent.service
  - deploy/windows-offline/Manage-SolarPlayer.ps1
  - apps/web/src/pages/Overview/viewModel.ts
tests:
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/config.test.ts
-->