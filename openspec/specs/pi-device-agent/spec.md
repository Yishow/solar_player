# pi-device-agent Specification

## Purpose

TBD - created by syncing change 'split-server-to-pc-thin-kiosk'. Update Purpose after archive.

## Requirements

### Requirement: Provide a read-only Pi device-status agent

The repository SHALL provide a lightweight device-status agent (`deploy/solar-device-agent.py`) that runs as a systemd service on a Pi 5, implemented with the Python 3 standard library (`http.server`) so it introduces no Node runtime dependency on the thin kiosk. The agent SHALL expose read-only JSON endpoints reporting the Pi's own host statistics so a remote server can read the Pi's real state without the server running on the Pi.

#### Scenario: Server reads Pi host statistics from the agent

- **WHEN** the server requests `GET http://<Pi_IP>:3001/stats`
- **THEN** the agent returns JSON containing disk, memory, CPU, and uptime figures read from the Pi's `/proc` and filesystem
- **AND** the figures reflect the Pi, not the requesting server host

#### Scenario: Operator reads Pi local display-unit logs from the agent

- **WHEN** an operator requests `GET http://<Pi_IP>:3001/logs?limit=20`
- **THEN** the agent returns a bounded number of recent records from the Pi's own local logs (the kiosk launcher log and, when the least-privilege journal helper is installed, recent solar-display journal records)
- **AND** the limit is clamped to the range 1..500
- **AND** these Pi-local logs are a display-unit diagnostic aid and are NOT the source of the server's Device Status app-log API (app logs remain server-side)


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
### Requirement: The agent SHALL restrict callers by source IP

The agent SHALL accept requests only from configured allowed source addresses (default: the server PC). A request from a non-allowed source SHALL be rejected with 403 and SHALL NOT return any host statistic or log content. The allowed sources SHALL be configurable without editing the agent source. If no allowed source is configured, the agent SHALL fail closed (reject all requesters with 403) so that an unconfigured agent never exposes Pi statistics; the thin-kiosk installer and skill SHALL require the operator to supply the server PC address.

#### Scenario: Allowed server PC can read the agent

- **GIVEN** the server PC address is in the allowed source list
- **WHEN** the server PC requests `GET /stats`
- **THEN** the agent returns the JSON statistics

#### Scenario: Non-allowed caller is rejected

- **GIVEN** a caller address is not in the allowed source list
- **WHEN** that caller requests `GET /stats`
- **THEN** the agent returns 403 and no statistic or log content


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
### Requirement: The agent SHALL run as a managed systemd service

The agent SHALL be installed as `solar-device-agent.service`, enabled at boot, and restarted on failure. The agent SHALL read journald, when available, through the existing least-privilege `read-solar-display-journal.sh` helper rather than running journalctl with arbitrary flags, preserving the existing security model. Because the thin-kiosk path does not run `install-kiosk.sh`, the thin-kiosk installer SHALL install that helper (copying the existing `deploy/read-solar-display-journal.sh` as the source without modifying it) together with its sudoers drop-in, so the agent can read journal on a thin kiosk; if the helper is absent the `/logs` endpoint SHALL return a bounded unavailable indication while `/stats` keeps working.

#### Scenario: Agent survives a reboot

- **WHEN** the Pi reboots
- **THEN** `solar-device-agent.service` is active and listening on its configured port
- **AND** the server can read Pi statistics immediately after the Pi returns

#### Scenario: Agent failure does not crash the Pi kiosk

- **WHEN** the agent process exits unexpectedly
- **THEN** systemd restarts it
- **AND** the Firefox kiosk session is unaffected because the agent is independent of the display session

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