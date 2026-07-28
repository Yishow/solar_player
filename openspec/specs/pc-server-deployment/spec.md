# pc-server-deployment Specification

## Purpose

TBD - created by syncing change 'split-server-to-pc-thin-kiosk'. Update Purpose after archive.

## Requirements

### Requirement: Run the Solar Player server as a Windows service on a PC

The repository SHALL provide a Windows PC deployment mode that runs the built server (`node apps/server/dist/server.js`) as a persistent Windows service via nssm (Non-Sucking Service Manager), binding to `0.0.0.0:3000` so the server is reachable from other hosts on the LAN. The deployment runbook SHALL document the nssm install, the repo-root working directory, and the service restart-on-failure behavior.

#### Scenario: Server starts automatically at PC boot before login

- **WHEN** the Windows PC boots and no user is logged in
- **THEN** the nssm service starts the Solar Player server automatically
- **AND** the server binds to `0.0.0.0:3000`
- **AND** `GET http://127.0.0.1:3000/health` from the PC returns 200

#### Scenario: Server restarts after a crash

- **WHEN** the server process exits unexpectedly
- **THEN** nssm restarts the service automatically without operator action


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
### Requirement: Allow inbound LAN traffic to the server port

The Windows PC deployment runbook SHALL require an inbound Windows Firewall rule that permits TCP 3000, because Windows Defender Firewall blocks inbound traffic by default. Without this rule, LAN kiosk clients cannot reach the server even though it binds to `0.0.0.0`.

#### Scenario: LAN kiosk reaches the server after firewall rule

- **GIVEN** the nssm service is running and the inbound TCP 3000 firewall rule is present
- **WHEN** a kiosk on the LAN requests `GET http://<PC_IP>:3000/health`
- **THEN** the response is 200

#### Scenario: Missing firewall rule is diagnosable

- **GIVEN** the nssm service is running but the inbound TCP 3000 firewall rule is absent
- **WHEN** the PC's own `GET http://127.0.0.1:3000/health` succeeds but a LAN kiosk connection times out
- **THEN** the runbook identifies the missing firewall rule as the cause


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
### Requirement: Provide a PC-specific environment file

The Windows PC deployment runbook SHALL document a PC-specific `.env` loaded from the repo root, covering at minimum `HOST=0.0.0.0`, `PORT=3000`, MQTT broker settings, and local `DATA_DIR`. The runbook SHALL flag that `better-sqlite3` is a native module that on Windows either resolves to a prebuilt binary or requires VS Build Tools, and that the Linux-only `pnpm dev:fix` does not apply.

#### Scenario: Operator builds and runs on Windows

- **WHEN** an operator runs `pnpm install` then `pnpm build` on the Windows PC
- **THEN** `apps/server/dist/server.js` and `apps/web/dist` are produced
- **AND** the nssm service can start and serve `/health` and `/overview`


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
### Requirement: Document Windows server logging and verification constraints

The runbook SHALL document two Windows-specific constraints. First, the nssm service SHALL redirect stdout/stderr to a log file on disk so server output is capturable, and the runbook SHALL state that the Device Status app-log API remains unavailable on Windows in this phase (the server has no journald); file-based log reading by Device Status is a future enhancement, not part of this change. Second, `pnpm verify` on Windows depends on non-default tooling (Git Bash providing `bash.exe`, and a `sqlite3` CLI on PATH, which `scripts/deploy.test.mjs` invokes); the runbook SHALL state the supported PC verification is the `build`, `server`, and `web` stages, and SHALL list the extra tooling required to run the full `pnpm verify` on Windows.

#### Scenario: Device Status app logs are unavailable on Windows

- **GIVEN** the server runs as an nssm service on Windows
- **WHEN** a trusted management caller requests Device Status app logs
- **THEN** the API returns a bounded unavailable response with a non-empty reason
- **AND** the runbook states this is expected on Windows in this phase

#### Scenario: PC verification is scoped to build/server/web stages

- **WHEN** an operator verifies the PC server on Windows
- **THEN** the runbook directs running the `build`, `server`, and `web` verification stages
- **AND** notes that the `deploy`/`server-runner` stages need Git Bash and `sqlite3` if full `pnpm verify` is desired


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
### Requirement: Provide a network-free Windows x64 deployment bundle

The repository SHALL build a ZIP for a Windows x64 PC with no network access. The ZIP SHALL contain the built application, a portable Windows Node runtime, pnpm, nssm, the Windows-native runtime dependency required by `better-sqlite3`, and an administrator PowerShell installer. The installer SHALL not run a package-manager install or download software on the target PC. It SHALL create a persistent `SolarPlayerServer` service, create its runtime directories, and add an inbound TCP 4000 firewall rule. Its generated `.env` SHALL bind `HOST=0.0.0.0` and `PORT=4000` unless the operator explicitly changes the port before installation.

#### Scenario: Offline Win11 installation succeeds on port 4000

- **GIVEN** an administrator has copied the ZIP to a network-isolated Windows x64 PC
- **WHEN** the administrator extracts it and runs `Install-SolarPlayer.ps1`
- **THEN** no package download or package-manager install is attempted
- **AND** `SolarPlayerServer` runs the bundled server on TCP 4000
- **AND** `GET http://127.0.0.1:4000/health` returns 200
- **AND** the firewall permits TCP 4000 from Pi kiosks

#### Scenario: Existing port 4000 owner is preserved

- **GIVEN** another process already listens on TCP 4000
- **WHEN** an administrator runs `Install-SolarPlayer.ps1`
- **THEN** the installer exits before replacing the service or firewall rule
- **AND** reports the existing listener as the action required


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
### Requirement: Provide a network-free Windows x64 portable launch bundle

The repository SHALL build a second ZIP for a network-isolated Windows x64 PC without administrator access. The portable ZIP SHALL include a command launcher and the same Windows-native runtime needed to start the built server from its extracted directory. The launcher SHALL default to TCP 4000, create only user-writable runtime directories in the extracted directory, and fail before startup when TCP 4000 is already listening. It SHALL not create a Windows service, modify firewall rules, download software, or run a package-manager install.

#### Scenario: Non-administrator starts the portable server

- **GIVEN** a non-administrator has extracted the portable ZIP to a writable folder and TCP 4000 is unused
- **WHEN** they run `Start-SolarPlayer.cmd`
- **THEN** the bundled server starts from that folder on TCP 4000
- **AND** `GET http://127.0.0.1:4000/health` returns 200
- **AND** no nssm service or firewall rule is created

#### Scenario: Portable launcher preserves an existing port owner

- **GIVEN** another process already listens on TCP 4000
- **WHEN** the user runs `Start-SolarPlayer.cmd`
- **THEN** the launcher exits before starting the bundled server
- **AND** tells the user that TCP 4000 must be freed or changed


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
### Requirement: Provide repeatable cross-platform bundle build entrypoints

The repository SHALL provide `scripts/build-windows-offline-bundle.sh` for macOS/Linux and `scripts/build-windows-offline-bundle.cmd` for Windows development hosts. Each entrypoint SHALL run `pnpm build` before delegating to `node scripts/build-windows-offline-bundle.mjs`, and SHALL stop without running the builder when the build command fails.

#### Scenario: Operator builds both ZIP variants with one platform-native command

- **GIVEN** a development host has the repository dependencies and required build artifacts can be produced
- **WHEN** the operator runs the platform-native entrypoint
- **THEN** `dist/deploy-bundles/solar-player-windows-x64-offline.zip` and `dist/deploy-bundles/solar-player-windows-x64-portable.zip` are produced by the existing builder

#### Scenario: Failed application build prevents packaging

- **GIVEN** `pnpm build` exits non-zero
- **WHEN** the operator runs either entrypoint
- **THEN** the entrypoint exits non-zero before invoking `build-windows-offline-bundle.mjs`


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
### Requirement: Provide a portable server management menu

The portable ZIP SHALL include `Manage-SolarPlayer.ps1`, which SHALL run without administrator privileges and present menu actions for background start, status and health, recent logs, and stop. The stop action SHALL call `Stop-Process` only when the TCP 4000 listener executable path equals the bundled `runtime\\node\\node.exe` beside the menu script; it SHALL warn and preserve a different port owner.

#### Scenario: Operator starts and checks the portable server in the background

- **GIVEN** TCP 4000 is unused and the portable ZIP is extracted to a writable directory
- **WHEN** the operator selects background start in `Manage-SolarPlayer.ps1`
- **THEN** it launches `Start-SolarPlayer.cmd` hidden, writes stdout/stderr log files beside the script, and reports the local health result

#### Scenario: Menu preserves an unrelated TCP 4000 process

- **GIVEN** TCP 4000 is listening from an executable other than the bundled `runtime\\node\\node.exe`
- **WHEN** the operator selects stop or status in `Manage-SolarPlayer.ps1`
- **THEN** the menu reports the owning PID
- **AND** it does not call `Stop-Process` for that process

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