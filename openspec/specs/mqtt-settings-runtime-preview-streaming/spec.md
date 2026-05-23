# mqtt-settings-runtime-preview-streaming Specification

## Purpose

TBD - created by archiving change 'stream-mqtt-runtime-previews-and-readiness-feedback'. Update Purpose after archive.

## Requirements

### Requirement: Stream MQTT runtime preview feedback to the management surface

The system SHALL stream MQTT runtime preview feedback to `MQTT Settings` so operators can see near-real-time topic activity and broker status inside the editable topic overview workspace.

#### Scenario: Topic starts receiving values

- **WHEN** a mapped MQTT topic starts receiving runtime values while `MQTT Settings` is open
- **THEN** the management surface SHALL reflect that topic activity without waiting for a coarse periodic reload only
- **AND** the operator SHALL be able to see that the topic is now active from the same topic row they use for editing


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
### Requirement: Preserve a readable fallback when live MQTT preview streaming is unavailable

The system SHALL preserve a readable fallback when near-real-time MQTT preview updates are unavailable, even after the runtime preview is merged into the editable topic overview card.

#### Scenario: Live preview updates are unavailable

- **WHEN** the management surface cannot receive near-real-time topic preview updates
- **THEN** it SHALL show a degraded or fallback state for the runtime preview
- **AND** it SHALL NOT present the preview as if it were fully live

##### Example: Streaming channel disconnect falls back to polled preview

- **GIVEN** `MQTT Settings` was showing live topic activity through a streaming channel
- **WHEN** the streaming connection drops while periodic preview polling still works
- **THEN** the page marks the runtime preview as degraded or fallback
- **AND** it does not continue labeling the preview as fully live until streaming resumes

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