# split-deployment-skill Specification

## Purpose

TBD - created by syncing change 'split-server-to-pc-thin-kiosk'. Update Purpose after archive.

## Requirements

### Requirement: Provide a repo-local split-topology deployment skill

The repository SHALL provide a discoverable skill (`.agents/skills/split-deployment/SKILL.md`) that guides an operator or AI agent through deploying the split topology where the Solar Player server runs on a Windows PC and one or more Raspberry Pi 5 units act as thin browser kiosks. The skill SHALL coexist with the existing `pi5-deployment` skill without modifying it, and SHALL cover the three phased scenarios: deploying the PC server, deploying a new Pi thin-kiosk, and migrating an existing co-located Pi to a thin-kiosk.

#### Scenario: Operator deploys the PC server first

- **WHEN** an operator follows the skill's PC server phase
- **THEN** the skill guides nssm service install, the PC-specific `.env`, the inbound TCP 3000 firewall rule, and the build/native-module prerequisites
- **AND** the skill states the completion gate that a LAN kiosk can reach `/health` and `/overview`

#### Scenario: Operator deploys a new Pi thin-kiosk after the server is up

- **WHEN** the PC server is reachable and an operator follows the skill's Pi thin-kiosk phase
- **THEN** the skill guides running the thin-kiosk installer with the server URL, the extended wait, and the reboot witness verified by the dedicated thin-kiosk verifier (not `verify-kiosk-install.sh`, which requires the local server)
- **AND** the skill states that the server PC must be powered on before or alongside the Pi

#### Scenario: Operator migrates an existing co-located Pi

- **WHEN** an operator follows the skill's migration phase for a Pi already running the co-located `solar-display.service`
- **THEN** the skill guides the explicit-confirmation migration that stops and disables the old service, installs the thin-kiosk pointing at the PC, and verifies with the thin-kiosk verifier
- **AND** the skill states that migration SHALL be performed one Pi at a time (canary first)

#### Scenario: Operator rolls a migrated Pi back to co-located mode

- **WHEN** an operator follows the skill's rollback for a migrated Pi
- **THEN** the skill guides re-enabling and starting the untouched `solar-display.service` AND repointing the kiosk back to the local server (by re-running the existing `install-kiosk.sh`, unmodified) AND confirming the `/data/solar-display` runtime is intact
- **AND** the skill states that re-enabling the service alone is insufficient because the kiosk autostart still points at the PC URL


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
### Requirement: The split-deployment skill SHALL NOT modify the existing deployment

The skill SHALL operate only through new files (the thin-kiosk installer, the device-agent, and the skill itself) plus the opt-in `DEVICE_AGENT_URL` branch in the server device route. The skill SHALL NOT instruct modifying the existing `deploy/` scripts, `solar-display.service`, `install-kiosk.sh`, the one-key deploy script, or the `pi5-deployment` skill. The existing co-located deployment SHALL remain fully functional and usable as rollback.

#### Scenario: Existing deployment stays intact after using the new skill

- **WHEN** an operator completes any phase of the split-deployment skill
- **THEN** the existing `pi5-deployment` skill and its underlying scripts remain byte-for-byte usable
- **AND** a co-located Pi that was not migrated continues to run unchanged

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