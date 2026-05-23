# cwa-weather-source-configuration Specification

## Purpose

TBD - created by archiving change 'add-cwa-weather-source-and-configuration'. Update Purpose after archive.

## Requirements

### Requirement: Persist configurable weather source settings for management surfaces

The system SHALL persist configurable weather source settings so management surfaces and playback shells can resolve the same weather behavior after reloads.

#### Scenario: Operator saves weather settings

- **WHEN** an operator saves weather settings with an enabled state, a location mode, a selected county or station, a preset, and explicit field keys
- **THEN** the system SHALL persist those settings as a first-class management contract
- **AND** subsequent reads SHALL return the same normalized settings without relying on browser-local state

##### Example: saved settings survive a reload

- **GIVEN** weather settings are saved with `enabled=true`, `locationMode=station`, `countyName=臺北市`, `stationId=C0I080`, `preset=standard`, and `fieldKeys=[weather,airTemperature,relativeHumidity,observationTime]`
- **WHEN** the management surface reloads and requests weather settings again
- **THEN** the returned settings SHALL preserve those values


<!-- @trace
source: add-cwa-weather-source-and-configuration
updated: 2026-05-24
code:
  - apps/server/src/app.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/server/src/config.ts
  - apps/server/src/db/migrations/010_weather_settings.sql
  - packages/shared/src/weather.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/services/weatherSettingsService.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/services/api.ts
  - AGENTS.md
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - .env.example
  - apps/web/src/components/headerWeatherMeta.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/MqttSettings/layout.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/routes/weather.ts
tests:
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
-->

---
### Requirement: Normalize CWA observations before exposing them to internal consumers

The system SHALL normalize Central Weather Administration observation payloads before exposing current weather data to internal consumers.

#### Scenario: CWA payload contains unavailable or special values

- **WHEN** the upstream observation payload contains special values that represent faults, unavailable readings, or non-numeric placeholders
- **THEN** the system SHALL translate those values into normalized nullable fields or explicit unavailable states
- **AND** it SHALL NOT expose the raw magic values to the web client as if they were valid readings

##### Example: special values are converted before reaching the web client

| Upstream field | Upstream value | Normalized result |
| -------------- | -------------- | ----------------- |
| `relativeHumidity` | `-99` | `null` |
| `windDirection` | `990` | `null` |
| `precipitation` | `X` | `null` |
| `airTemperature` | `31.4` | `31.4` |


<!-- @trace
source: add-cwa-weather-source-and-configuration
updated: 2026-05-24
code:
  - apps/server/src/app.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/server/src/config.ts
  - apps/server/src/db/migrations/010_weather_settings.sql
  - packages/shared/src/weather.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/services/weatherSettingsService.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/services/api.ts
  - AGENTS.md
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - .env.example
  - apps/web/src/components/headerWeatherMeta.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/MqttSettings/layout.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/routes/weather.ts
tests:
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
-->

---
### Requirement: Serve cached current weather with an explicit stale state

The system SHALL serve the last successful normalized weather snapshot when the upstream provider is temporarily unavailable, and it SHALL mark that response as stale.

#### Scenario: Upstream request fails after a successful fetch

- **WHEN** the system already has a previously normalized weather snapshot and a later upstream fetch fails or times out
- **THEN** the current weather API SHALL return the cached snapshot instead of an empty fabricated reading
- **AND** the response SHALL mark the snapshot as stale or fallback data
- **AND** the response SHALL retain the last successful update timestamp

##### Example: stale cache is returned after timeout

- **GIVEN** the last successful weather snapshot was normalized at `2026-05-23T14:20:00+08:00`
- **AND** a later upstream request times out
- **WHEN** the client requests current weather
- **THEN** the API SHALL return the `2026-05-23T14:20:00+08:00` snapshot
- **AND** the response SHALL indicate that the data is stale

<!-- @trace
source: add-cwa-weather-source-and-configuration
updated: 2026-05-24
code:
  - apps/server/src/app.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/server/src/config.ts
  - apps/server/src/db/migrations/010_weather_settings.sql
  - packages/shared/src/weather.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/services/weatherSettingsService.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/services/api.ts
  - AGENTS.md
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - .env.example
  - apps/web/src/components/headerWeatherMeta.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/MqttSettings/layout.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/routes/weather.ts
tests:
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
-->