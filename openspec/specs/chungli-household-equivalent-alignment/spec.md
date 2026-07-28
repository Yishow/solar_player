# chungli-household-equivalent-alignment Specification

## Purpose

TBD - created by archiving change 'align-chungli-household-equivalent'. Update Purpose after archive.

## Requirements

### Requirement: Cumulative household equivalence follows the active factory generation scope

The Sustainability runtime SHALL derive the cumulative household-equivalent card from the same factory generation scope, total generation value, freshness state, and timestamp as its cumulative generation headline.

#### Scenario: Chungli cumulative summary is fresh

- **WHEN** Chungli is the only enabled factory playback page and its summary has matching fresh `today_mwh`, `month_mwh`, and `total_mwh` values
- **THEN** the cumulative household-equivalent card SHALL calculate households from Chungli `total_mwh` converted to kWh and divided by the configured daily household usage
- **AND** the card provenance SHALL identify the Chungli MQTT aggregate timestamp

##### Example: Chungli total produces a four-person household equivalent

- **GIVEN** Chungli `total_mwh` is `45678` and daily household usage is `13 kWh`
- **WHEN** the Sustainability runtime builds the cumulative household-equivalent card
- **THEN** its household count SHALL be `3,513,692`

#### Scenario: Chungli summary is stale

- **WHEN** Chungli is the active factory scope and its summary is stale, missing, invalid, or regressed
- **THEN** the cumulative household-equivalent card SHALL be unavailable
- **AND** it SHALL NOT fall back to an unrelated global cumulative counter

<!-- @trace
source: align-chungli-household-equivalent
updated: 2026-07-28
code:
  - apps/web/src/pages/MqttSettings/index.tsx
  - deploy/install-thin-kiosk.sh
  - .env.example
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - deploy/solar-device-agent.py
  - docs/ops/conventions.md
  - scripts/build-windows-offline-bundle.mjs
  - apps/server/src/config.ts
  - deploy/windows-offline/Install-SolarPlayer.ps1
  - deploy/verify-thin-kiosk.sh
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - deploy/solar-device-agent.service
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - scripts/deploy.test.mjs
  - .agents/skills/split-deployment/SKILL.md
  - apps/server/src/routes/settings-mqtt.ts
  - deploy/windows-offline/Start-SolarPlayer.cmd
  - apps/server/src/services/householdEquivalenceService.ts
tests:
  - apps/server/src/routes/device.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
-->