# device-status-log-access Specification

## Purpose

TBD - created by archiving change 'harden-device-status-logs-diagnostics-and-telemetry-runtime'. Update Purpose after archive.

## Requirements

### Requirement: Provide ESM-safe Device Status log access

The system SHALL provide bounded recent solar-display log records and a bounded text export for Device Status through routes that remain safe to call in the current Node ESM runtime. Those routes SHALL only expose log evidence to trusted management callers. The system SHALL source these logs from the solar-display service logs on the server host (the systemd journald unit on Linux hosts); the `DEVICE_AGENT_URL` configuration SHALL NOT affect log sourcing (it affects host-statistics sourcing only). On a server host without journald (for example Windows), the log route SHALL return a bounded unavailable response with a non-empty reason rather than an empty success, and the server SHALL remain healthy. The response JSON shape (source, available, entries, retention, unavailableReason) SHALL be unchanged for co-located Linux deployments.

#### Scenario: Operator reads recent production logs from the local unit

- **WHEN** a trusted management caller requests recent device logs from Device Status on a Linux server host
- **THEN** the server reads only the solar-display systemd unit
- **AND** the response identifies source as journald
- **AND** the response includes available status, bounded entries, retention boundary, and an unavailable reason that is null

##### Example: Recent log response shape

- **GIVEN** the journal contains one solar-display error record
- **WHEN** the operator requests GET /api/device/logs?limit=20
- **THEN** the JSON data contains source, available, entries, retention, and unavailableReason
- **AND** the error record includes timestamp, priority, and message without host file paths

#### Scenario: Log access is unavailable on a non-journald server host

- **WHEN** the server runs on a host without journald (for example a Windows PC) and a trusted management caller requests recent device logs
- **THEN** the API returns a bounded unavailable response with a non-empty unavailableReason
- **AND** it does not return a successful empty file listing
- **AND** `DEVICE_AGENT_URL` does not change this behavior (logs are not sourced from the Pi device-agent)

#### Scenario: Operator exports bounded logs

- **WHEN** a trusted management caller requests GET /api/device/logs/export with a valid bounded limit on a Linux server host
- **THEN** the server returns text/plain content sourced from the solar-display journald unit
- **AND** Content-Disposition identifies a downloadable bounded log export
- **AND** the export never exceeds the configured maximum record count

#### Scenario: Log source is unavailable

- **WHEN** the solar-display unit cannot be read or the server host has no journald
- **THEN** the API returns a bounded unavailable response with a non-empty reason
- **AND** it does not return a successful empty file listing
- **AND** the route remains callable in the current Node ESM server runtime
- **AND** the server `/health` endpoint is unaffected

#### Scenario: Untrusted caller is denied log evidence

- **WHEN** an untrusted caller requests device log entries or export content
- **THEN** the server SHALL return an explicit denied response
- **AND** it SHALL NOT execute journal export for the caller
- **AND** it SHALL NOT expose log content, retention metadata, or host paths


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
### Requirement: Provide Device Status host statistics with remote-agent sourcing

The system SHALL provide Device Status host statistics (disk, memory, CPU load, uptime) to trusted management callers. When `DEVICE_AGENT_URL` is set, the system SHALL source these statistics from the remote Pi device-agent so they reflect the Pi; when `DEVICE_AGENT_URL` is not set, the system SHALL read the local `/proc` filesystem as before. The response shape SHALL be identical in both modes.

#### Scenario: Management panel shows Pi host statistics

- **GIVEN** `DEVICE_AGENT_URL` is set to the Pi device-agent address
- **WHEN** a trusted management caller reads Device Status host statistics
- **THEN** the returned disk, memory, CPU load, and uptime reflect the Pi, not the server host

#### Scenario: Host statistics fall back to local when agent is not configured

- **WHEN** `DEVICE_AGENT_URL` is not set
- **THEN** the system reads host statistics from the local `/proc` filesystem
- **AND** co-located deployments observe unchanged behavior

#### Scenario: Remote agent unreachable degrades gracefully

- **GIVEN** `DEVICE_AGENT_URL` is set but the Pi device-agent is unreachable
- **WHEN** a trusted management caller reads Device Status host statistics
- **THEN** the system returns a bounded unavailable indication with a non-empty reason rather than a 500 error
- **AND** the server remains healthy

<!-- @trace
source: align-device-log-source-and-release-identity
updated: 2026-07-14
code:
  - apps/server/src/services/deviceLogService.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - deploy.md
  - scripts/generate-release-manifest.mjs
  - deploy.sh
  - deploy/install-kiosk.sh
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/device.ts
  - deploy/read-solar-display-journal.sh
  - apps/server/src/services/releaseIdentityService.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/DeviceStatus/index.tsx
  - deploy/deploy.sh
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
tests:
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/services/api.test.ts
-->

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