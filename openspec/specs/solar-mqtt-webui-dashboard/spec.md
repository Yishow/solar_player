# solar-mqtt-webui-dashboard Specification

## Purpose

TBD - created by archiving change 'modernize-solar-mqtt-webui'. Update Purpose after archive.

## Requirements

### Requirement: Dual Visual Theme Support
The Web Console SHALL support switching between Dark Tech (`data-theme="dark"`) and Clean Light (`data-theme="light"`) visual themes. The selected theme SHALL be persisted in browser `localStorage` and restored upon subsequent page loads.

#### Scenario: Switch from dark theme to light theme
- **WHEN** user clicks the theme toggle button while in dark mode
- **THEN** document root theme attribute changes to `data-theme="light"` and preference is saved to `localStorage`

#### Scenario: Restore saved theme on page initialization
- **WHEN** page loads and `localStorage` contains a saved theme preference
- **THEN** document root theme attribute is initialized with the saved theme


<!-- @trace
source: modernize-solar-mqtt-webui
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - apps/server/src/db/migrate.ts
  - solar_mqtt_go/assets/tray.ico
  - AGENTS.md
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - solar_mqtt_go/start.sh
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - start.sh
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/display/display.go
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - .agents/skills/openspec-archive-change/SKILL.md
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/scopedMetricMigration.ts
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/tray/run.go
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/tray/app.go
  - scripts/deploy.test.mjs
  - solar_mqtt_go/go.mod
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/routes/settings-mqtt.ts
  - start.ps1
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/assets/assets.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/tray/logfile.go
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/assets/assets_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
-->

---
### Requirement: Dual Layout Mode Support
The Web Console SHALL support switching between Split Grid mode (both factories displayed side by side) and Factory Tabs mode (tabbed interface displaying one selected factory at a time). The selected layout mode SHALL be persisted in browser `localStorage`.

#### Scenario: Toggle layout mode from split grid to tabs
- **WHEN** user selects Factory Tabs layout mode
- **THEN** the console view switches to single-factory tabbed view showing active factory and preserves active telemetry data

#### Scenario: Toggle factory tab in tabs mode
- **WHEN** user clicks a factory tab button (e.g. "CL") in Factory Tabs mode
- **THEN** the view updates to display the selected factory dashboard and controls


<!-- @trace
source: modernize-solar-mqtt-webui
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - apps/server/src/db/migrate.ts
  - solar_mqtt_go/assets/tray.ico
  - AGENTS.md
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - solar_mqtt_go/start.sh
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - start.sh
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/display/display.go
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - .agents/skills/openspec-archive-change/SKILL.md
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/scopedMetricMigration.ts
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/tray/run.go
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/tray/app.go
  - scripts/deploy.test.mjs
  - solar_mqtt_go/go.mod
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/routes/settings-mqtt.ts
  - start.ps1
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/assets/assets.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/tray/logfile.go
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/assets/assets_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
-->

---
### Requirement: Real-Time Summary KPI Metrics
The Web Console SHALL display structured summary KPI metric cards for each factory, showing Total Power in kW, Today Generation in MWh, Month Generation in MWh, and Total Lifetime Generation in MWh, aligned with terminal display formatting.

#### Scenario: Update summary KPIs on incoming summary telemetry
- **WHEN** a new `${prefix}/${factoryId}/summary` message arrives
- **THEN** the factory KPI cards update to display formatted numerical values for Total Power, Today, Month, and Total generation


<!-- @trace
source: modernize-solar-mqtt-webui
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - apps/server/src/db/migrate.ts
  - solar_mqtt_go/assets/tray.ico
  - AGENTS.md
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - solar_mqtt_go/start.sh
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - start.sh
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/display/display.go
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - .agents/skills/openspec-archive-change/SKILL.md
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/scopedMetricMigration.ts
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/tray/run.go
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/tray/app.go
  - scripts/deploy.test.mjs
  - solar_mqtt_go/go.mod
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/routes/settings-mqtt.ts
  - start.ps1
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/assets/assets.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/tray/logfile.go
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/assets/assets_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
-->

---
### Requirement: Comprehensive 8-Column Zone Grid with Dynamic Discovery
The Web Console SHALL render all 8 zone fields in a structured table for each factory: Zone ID, Zone Name, Power (kW), Today (kWh), Month (MWh), Total (MWh), Capacity (kWp), and Today Hours (h). When telemetry for an unseen `zone_id` arrives under `${prefix}/${factoryId}/zone/#`, the table SHALL dynamically add a new row in ascending order by Zone ID.

#### Scenario: Receive telemetry for a newly added zone
- **WHEN** an MQTT message arrives for `${prefix}/${factoryId}/zone/3` for a factory that previously had only zones 1 and 2
- **THEN** the UI dynamically creates a new row for Zone 3 in the zone table ordered after Zone 2

#### Scenario: Update existing zone metrics in-place
- **WHEN** an MQTT message arrives with updated values for an existing zone
- **THEN** the corresponding table row updates its cell values in-place without resetting table structure


<!-- @trace
source: modernize-solar-mqtt-webui
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - apps/server/src/db/migrate.ts
  - solar_mqtt_go/assets/tray.ico
  - AGENTS.md
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - solar_mqtt_go/start.sh
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - start.sh
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/display/display.go
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - .agents/skills/openspec-archive-change/SKILL.md
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/scopedMetricMigration.ts
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/tray/run.go
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/tray/app.go
  - scripts/deploy.test.mjs
  - solar_mqtt_go/go.mod
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/routes/settings-mqtt.ts
  - start.ps1
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/assets/assets.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/tray/logfile.go
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/assets/assets_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
-->

---
### Requirement: Hardened Security and Control Contract Preservation
The Web Console SHALL preserve all existing control correlation tokens (`cmd/get-config`, `cmd/set`, `state/config`, `state/control-result`, `requestId`, `ttlSeconds`), credential memory-only isolation, non-persistent credential inputs, and subscription lifecycle resets on error or disconnect as verified by backend test suites.

#### Scenario: Unload and error lifecycle reset
- **WHEN** the MQTT client encounters an error or disconnects
- **THEN** the console resets subscription status indicators and guards against credential leakage in DOM attributes


<!-- @trace
source: modernize-solar-mqtt-webui
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - apps/server/src/db/migrate.ts
  - solar_mqtt_go/assets/tray.ico
  - AGENTS.md
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - solar_mqtt_go/start.sh
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - start.sh
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/display/display.go
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - .agents/skills/openspec-archive-change/SKILL.md
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/scopedMetricMigration.ts
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/tray/run.go
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/tray/app.go
  - scripts/deploy.test.mjs
  - solar_mqtt_go/go.mod
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/routes/settings-mqtt.ts
  - start.ps1
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/assets/assets.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/tray/logfile.go
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/assets/assets_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
-->

---
### Requirement: Interactive Config JSON Viewer and Editor
The Web Console SHALL display the remote configuration JSON (`solar/{factoryId}/state/config`) in the Operations Drawer with support for both structured field editing and raw JSON editing modes. Changes made in JSON editing mode SHALL be validated and submitted via the existing `cmd/set` control protocol.

#### Scenario: View formatted config JSON
- **WHEN** user loads configuration for a factory via `cmd/get-config`
- **THEN** the received config JSON is formatted and displayed in the JSON viewer/editor area.

#### Scenario: Edit and submit changes via JSON editor
- **WHEN** user modifies configuration values in JSON mode and clicks Save
- **THEN** the JSON is validated and transmitted via `cmd/set` with the standard control envelope.

<!-- @trace
source: modernize-solar-mqtt-webui
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - apps/server/src/db/migrate.ts
  - solar_mqtt_go/assets/tray.ico
  - AGENTS.md
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - solar_mqtt_go/start.sh
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - start.sh
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/display/display.go
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - .agents/skills/openspec-archive-change/SKILL.md
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/scopedMetricMigration.ts
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/tray/run.go
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/tray/app.go
  - scripts/deploy.test.mjs
  - solar_mqtt_go/go.mod
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/routes/settings-mqtt.ts
  - start.ps1
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/assets/assets.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/tray/logfile.go
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/assets/assets_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
-->