# mqtt-settings-weather-management Specification

## Purpose

TBD - created by archiving change 'reorganize-mqtt-settings-topic-and-weather-management'. Update Purpose after archive.

## Requirements

### Requirement: Configure weather settings from MQTT Settings

The system SHALL allow operators to configure header weather behavior directly from `MQTT Settings`.

#### Scenario: Operator edits weather behavior in the management page

- **WHEN** an operator opens `MQTT Settings`
- **THEN** the page SHALL provide controls for enabling weather, selecting a location mode, choosing a county or station, selecting a preset, and editing custom field choices
- **AND** the operator SHALL NOT need to navigate to a separate management route to perform those weather-setting tasks


<!-- @trace
source: reorganize-mqtt-settings-topic-and-weather-management
updated: 2026-05-24
code:
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/AppHeader.tsx
  - .env.example
  - packages/shared/src/weather.ts
  - apps/server/src/db/migrations/010_weather_settings.sql
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/web/src/pages/MqttSettings/layout.ts
  - apps/server/src/services/weatherSettingsService.ts
  - packages/shared/src/index.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/server/src/config.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - AGENTS.md
tests:
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
-->

---
### Requirement: Support presets with a custom-field fallback

The system SHALL support weather field presets and a custom-field mode in `MQTT Settings`.

#### Scenario: Operator selects a preset

- **WHEN** the operator switches to a named preset such as compact, standard, or complete
- **THEN** the page SHALL apply the preset's field list to the weather preview and pending settings
- **AND** it SHALL NOT require the operator to re-check every field manually

#### Scenario: Operator selects custom mode

- **WHEN** the operator switches to custom mode
- **THEN** the page SHALL expose explicit field selection controls
- **AND** the resulting field list SHALL drive the weather preview and saved settings


<!-- @trace
source: reorganize-mqtt-settings-topic-and-weather-management
updated: 2026-05-24
code:
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/AppHeader.tsx
  - .env.example
  - packages/shared/src/weather.ts
  - apps/server/src/db/migrations/010_weather_settings.sql
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/web/src/pages/MqttSettings/layout.ts
  - apps/server/src/services/weatherSettingsService.ts
  - packages/shared/src/index.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/server/src/config.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - AGENTS.md
tests:
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
-->

---
### Requirement: Preview header weather composition before saving

The system SHALL preview the configured header weather summary inside the weather card before the operator saves the settings.

#### Scenario: Preview reacts to pending field changes

- **WHEN** the operator changes the selected station, preset, or field list in the weather card
- **THEN** the preview SHALL update from the pending form state
- **AND** the operator SHALL be able to inspect the resulting header composition before saving

<!-- @trace
source: reorganize-mqtt-settings-topic-and-weather-management
updated: 2026-05-24
code:
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/AppHeader.tsx
  - .env.example
  - packages/shared/src/weather.ts
  - apps/server/src/db/migrations/010_weather_settings.sql
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/web/src/pages/MqttSettings/layout.ts
  - apps/server/src/services/weatherSettingsService.ts
  - packages/shared/src/index.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/server/src/config.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - AGENTS.md
tests:
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
-->