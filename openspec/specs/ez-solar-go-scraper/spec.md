# ez-solar-go-scraper Specification

## Purpose

TBD - created by archiving change 'refactor-solar-mqtt-to-go'. Update Purpose after archive.

## Requirements

### Requirement: CLI command surface parity

The Go implementation SHALL provide a Windows-only CLI with the same subcommands, side effects, output categories, and exit semantics as the current Python data-plane entry script scrape_solar.py: run (default when no subcommand is given), once, test-login [FACTORY_ID], test-mqtt, dump-api [FACTORY_ID], history [--factory ID] [--limit N], and alerts [--limit N]. It SHALL NOT provide install-service, NSSM integration, or service-install batch generation. The legacy global flag --once SHALL trigger the same code path as once. The once paths SHALL fetch, record, and print only; they SHALL NOT connect to MQTT, start mosquitto, publish topics, start heartbeat, or publish Home Assistant discovery.

#### Scenario: Default invocation starts the service loop

- **WHEN** the binary is started with no arguments
- **THEN** the run command executes and the service banner prints broker, prefix, factory list, SQLite state, HA discovery state, and night pause state before workers start

#### Scenario: once fetches every configured factory one round

- **WHEN** the once command runs against a config with N factories
- **THEN** each factory is fetched exactly once, recorded to storage, and its result is printed to the terminal
- **AND** a failing factory prints a failure line and does not abort the remaining factories
- **AND** no MQTT connection or publication is attempted

#### Scenario: test-login reports per-factory result

- **WHEN** test-login runs with an optional factory_id filter
- **THEN** each selected factory prints either a login OK line or a login failure line containing the error

#### Scenario: history and alerts read the shared SQLite database

- **WHEN** history or alerts runs
- **THEN** rows are read from the same SQLite schema used by the Python version, ordered by ts descending, limited by --limit (default 50)


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Configuration file compatibility

The Go implementation SHALL read and write solar_config.json beside the built executable, independent of the process working directory, as the deployed equivalent of Python CONFIG_PATH. It SHALL preserve the exact Python format, global keys, defaults, factory keys (factory_id, base_url, login_user, login_pass), per-factory defaults, legacy migration, unknown global and factory keys, and temp-file-plus-replace save behavior. Boolean coercion SHALL match Python exactly: after lower-casing, only string values "1", "true", "yes", and "on" become true; every other string becomes false without a warning; non-string values use Python-bool-equivalent truthiness. Numeric coercion SHALL accept numeric strings and SHALL keep the pre-load value with a warning when int/float conversion fails.

#### Scenario: Existing Python config loads unchanged

- **WHEN** the Go service starts with a solar_config.json written by the Python version
- **THEN** all global and factory values match what the Python version would load
- **AND** unknown keys present in the file are retained and written back on save
- **AND** launching the built binary from a different working directory still loads the config beside the executable

##### Example: boolean coercion matches Python

| JSON value | Effective boolean | Warning |
| --- | --- | --- |
| `"true"` | `true` | no |
| `"1"` | `true` | no |
| `"off"` | `false` | no |
| `"banana"` | `false` | no |
| `0` | `false` | no |
| `2` | `true` | no |

#### Scenario: Legacy single-factory config migrates

- **WHEN** the config file lacks a factories array but contains factory-level keys
- **THEN** the loaded in-memory config moves the top-level factory keys into a single-element factories array and prints a migration notice
- **AND** load alone does not rewrite the source file; the migrated shape is written only by a later explicit save

#### Scenario: set command updates and persists

- **WHEN** a /set payload changes any global or factory field
- **THEN** the in-memory config is updated, the file is saved atomically, and the effective config is republished to the config topic


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: MQTT topic and payload contract

The Go implementation SHALL publish to the same topics with the same JSON payload shapes as the Python version, under {prefix}/{factory}: summary (summary fields plus factory and timestamp), total_power_kw, today_mwh, month_mwh, total_mwh (only when the factory total is complete), zone/{zone_id} (full zone object plus factory and timestamp), zone/{zone_id}/power_kw, zone/{zone_id}/today_kwh, zone/{zone_id}/month_mwh, zone/{zone_id}/total_mwh, zone/{zone_id}/capacity_kwp, zone/{zone_id}/today_hours (each as {"value": ...}), status, heartbeat, alert, and config. Retain flags per message class SHALL follow the mqtt_retain_summary, mqtt_retain_zone, mqtt_retain_status, mqtt_retain_config, mqtt_retain_alert, and mqtt_retain_heartbeat settings with the same defaults (summary/zone/status/config retained, alert/heartbeat not retained). The timestamp format SHALL be second-precision local ISO-8601.

#### Scenario: One fetch round publishes the expected topic set

- **WHEN** a factory worker completes a successful fetch with 2 zones
- **THEN** summary, total_power_kw, today_mwh, month_mwh, and per-zone full and metric topics are published with the shapes listed above
- **AND** summary and zone payloads carry the factory id and a second-precision timestamp

#### Scenario: Retain flags follow config

- **WHEN** mqtt_retain_zone is set to false
- **THEN** zone topics are published with retain=false on the next round
- **AND** summary retain behavior is unaffected


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Factory total integrity guard

The Go implementation SHALL compute summary total_mwh as the rounded sum (3 decimal places) of finite zone total_mwh values only when the zone list is non-empty, no previous zone id is missing from the current list, and every zone total is a finite number; otherwise it SHALL omit total_mwh and raise a WARN alert naming up to 10 affected zone ids.

#### Scenario: Complete zone set produces total_mwh

- **WHEN** all zones from the previous round are present and every total_mwh is finite
- **THEN** total_mwh is published as the sum rounded to 3 decimals

#### Scenario: Missing or invalid zone suppresses total_mwh

- **WHEN** a zone present last round is missing, or any zone total_mwh is non-numeric or non-finite
- **THEN** the summary total_mwh key is omitted and a WARN alert lists the affected zone ids


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: MQTT command handling

The Go implementation SHALL subscribe to {bus_prefix}/{factory}/cmd/set and {bus_prefix}/{factory}/cmd/get-config per factory with QoS 1 over one shared broker connection, dispatching both commands to a single registered ControlHandler per factory; state topics SHALL NOT reach the control handler. This intentionally hardens the control plane beyond the Python baseline (data-plane behavior remains Python-parity); control results are correlated and the control plane is side-effect idempotent.

A command SHALL carry an envelope: requestId (required, trimmed, max 128 chars), issuedAt (RFC3339Nano or epoch seconds), ttlSeconds (integer 1..300), optional site (non-empty string that SHALL equal the factory id), changes (set only, object), restart (set only, boolean). Unknown envelope fields SHALL be rejected with UNKNOWN_FIELD; a too-far-future issuedAt SHALL be rejected with COMMAND_FUTURE; an expired command SHALL be rejected with COMMAND_EXPIRED; a missing or blank requestId SHALL cause the command to be ignored without a ledger entry or result.

Every command with a usable requestId SHALL be executed at most once per site via a persistent idempotency ledger: the result SHALL be durably recorded before publication, a repeated requestId SHALL yield a DUPLICATE_REQUEST result without re-executing any side effect, and ledger records older than 24 hours SHALL be purged by a manager-lifecycle periodic task as well as opportunistically during command handling. The periodic task SHALL stop with the manager context without leaking a goroutine. When the ledger is unavailable, commands SHALL be rejected with LEDGER_UNAVAILABLE and no side effects.

Remote-set persistence SHALL use a request-scoped 0600 pending snapshot in the config directory. The ledger accepted record SHALL become durable before the live config atomic rename; a ledger failure SHALL discard only that request's pending snapshot and restore memory. A failed live rename SHALL leave the old live config in place, restore memory, replace the ledger result with `PERSISTENCE_FAILED`, and publish a rejected result. If live rename succeeds but pending cleanup fails, the operation SHALL remain accepted: memory, live config, ledger, and accepted result SHALL agree; cleanup SHALL be warned and the manager SHALL cancel/fail closed without publishing a rejected result. On manager startup, every pending snapshot SHALL be resolved before control subscriptions are registered: disabled/closed/unavailable/error ledger lookup SHALL fail recovery, retain the pending snapshot, and prevent startup; only a successful lookup proving missing or rejected SHALL permit cleanup. An accepted snapshot already equal to the live config SHALL be cleaned without rewriting it, and cleanup failure SHALL still prevent startup. `StartAll` SHALL return an error and SHALL NOT accept subsequent control snapshots until recovery succeeds.

A get-config command SHALL publish a sanitized retained config state on {configured_prefix}/{factory}/state/config (allowlisted runtime fields plus revision and updated_at; never secrets or credential fields) and a non-retained accepted result on {configured_prefix}/{factory}/state/control-result. A set command SHALL apply only the remote allowlist (interval, night_pause, night_padding_min, anomaly_daytime_zero_minutes, heartbeat_interval, mqtt_retain_summary, mqtt_retain_zone, mqtt_retain_status, mqtt_retain_alert, mqtt_retain_heartbeat) via the Python coercion rules with range validation; credential, scraper, broker, and path fields (base_url, login_user, login_pass, mqtt_host, mqtt_port, mqtt_prefix, mosquitto_path, mosquitto_config, factory_id) SHALL be rejected with a bounded rejected result and SHALL NOT be applied. Applying changes SHALL bump the config revision, persist via the atomic save path, update runtime settings (heartbeat interval, anomaly threshold), and republish the config state. The complete remote-set mutation, persistence, and rollback sequence SHALL be serialized across factories sharing one Config, so a failed command SHALL NOT restore over another factory's accepted mutation. The `restart` flag SHALL be treated as an unsupported action: a command containing `restart=true` SHALL return stable code `RESTART_UNSUPPORTED`, atomically reject all accompanying changes, SHALL NOT exit the process, SHALL NOT invoke NSSM or another supervisor, and SHALL NOT trigger relaunch. Rejected, expired, duplicate, and ledger-unavailable commands SHALL produce bounded results without configuration or lifecycle side effects. The mqttbus SHALL NOT resubscribe or reconnect from inside the set handler; broker/prefix transport settings are deployment-level and take effect on process restart.

#### Scenario: set applies allowlisted change exactly once

- **WHEN** a cmd/set envelope with a fresh requestId carries changes {"interval": 90}
- **THEN** the config is updated, persisted atomically, the revision bumps, and an accepted result with changedKeys ["interval"] is published on state/control-result
- **AND** replaying the same requestId yields a DUPLICATE_REQUEST result with no further config change

#### Scenario: get-config publishes sanitized state

- **WHEN** the bus receives a message on {bus_prefix}/{factory}/cmd/get-config
- **THEN** a sanitized retained config state is published on {configured_prefix}/{factory}/state/config
- **AND** a non-retained accepted result is published on {configured_prefix}/{factory}/state/control-result

#### Scenario: credential fields are rejected atomically

- **WHEN** a cmd/set envelope carries changes containing base_url or login_pass
- **THEN** a rejected result with a bounded code is published
- **AND** no allowlisted field changes and the scraper session is not cleared

#### Scenario: expired command has no side effects

- **WHEN** a cmd/set envelope has issuedAt older than ttlSeconds
- **THEN** a rejected result is published and no configuration or lifecycle side effect occurs

#### Scenario: restart action is rejected without relaunch

- **WHEN** a cmd/set envelope with a fresh requestId carries restart=true, with or without allowlisted changes
- **THEN** the result is rejected with stable code `RESTART_UNSUPPORTED`
- **AND** no accompanying configuration change is persisted
- **AND** the process remains running without exit or relaunch

#### Scenario: state topics bypass the control handler

- **WHEN** a message arrives on a state topic such as {bus_prefix}/{factory}/summary
- **THEN** the control handler is not invoked


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Broker transport hardening via environment

The Go implementation SHALL load broker transport credentials exclusively from the deployment environment (SOLAR_MQTT_USERNAME, SOLAR_MQTT_PASSWORD, optional SOLAR_MQTT_TLS_CA_FILE and SOLAR_MQTT_TLS_SERVER_NAME) and SHALL fail closed before connecting when username or password is empty, the port is out of range, or the prefix is empty. Non-loopback brokers SHALL require a verified TLS configuration (InsecureSkipVerify is rejected; a ServerName is required when a CA file is configured remotely). Credentials SHALL NOT be stored in solar_config.json, MQTT state, or logs.

When loading legacy configuration, the implementation SHALL drop only the exact unknown global broker/control/TLS credential keys covered by the migration scrub list (including mqtt_username, mqtt_password, broker_username, broker_password, control_username, control_password, and TLS certificate/key/passphrase forms), while preserving non-secret unknown compatibility keys. Factory-schema site login fields remain factory data and are not removed by this unknown-global scrub.

#### Scenario: missing credentials fail closed

- **WHEN** the transport environment lacks SOLAR_MQTT_USERNAME or SOLAR_MQTT_PASSWORD
- **THEN** the service exits before any MQTT connection attempt and prints the rejection reason

#### Scenario: remote broker requires verified TLS

- **WHEN** the configured broker host is not loopback and no TLS configuration is provided
- **THEN** the connection is rejected

#### Scenario: credentials stay out of persisted config

- **WHEN** the effective config is saved or republished
- **THEN** no username, password, or TLS material appears in the file or payload


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Scraper login and extraction parity

The Go implementation SHALL log in to {base_url}/default.aspx using a cookie-carrying HTTP session with the same browser headers as the Python version, posting all hidden form fields with deftxt1=login_user, deftxt2=login_pass, and defbtn1 included, then POST to api/s_json.ashx with form id 00_00 for summary and 00_02 for zones. Summary SHALL map x0/x1/x2 to total_power_kw/today_mwh/month_mwh as nullable floats. Zones SHALL map x0 to name (trimmed), x4 to power_kw, x5 to today_kwh, x6 to month_mwh, x7 to total_mwh, x8 to serial (trimmed), x12 to capacity_kwp, assign process-local stable zone ids keyed by serial with positional fallback, and compute today_hours as today_kwh / capacity_kwp rounded to 2 decimals when capacity is positive. A failed service-loop fetch SHALL clear the session so the next round re-logs-in and publishes an error status. A failed login POST with HTTP status 400 or greater, or a successful HTTP response that still contains deftxt1, SHALL dump debug_login_fail_{factory_id}.html; an initial login-page GET failure SHALL propagate without a required debug dump, matching Python.

#### Scenario: Stable zone id survives reordering and naming

- **WHEN** the API returns zones whose x8 serials are stable across rounds
- **THEN** each serial keeps the same zone_id across rounds regardless of list position

#### Scenario: Login failure is diagnosable

- **WHEN** the login POST returns HTTP status 400 or greater, or its response still contains deftxt1
- **THEN** the failed response HTML is dumped to debug_login_fail_{factory_id}.html
- **AND** a service-loop fetch reports the error status and clears the session

#### Scenario: Initial login page failure propagates without a required dump

- **WHEN** the initial GET of default.aspx fails before a login POST response exists
- **THEN** the error is returned to the caller
- **AND** no debug_login_fail_{factory_id}.html file is required


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: SQLite storage compatibility

The Go implementation SHALL create and write the same three data tables (summary, zone, alert) with the same columns, primary keys, and indexes as the Python version, using INSERT OR REPLACE semantics for summary and zone rows keyed by (ts, factory_id[, zone_id]). It SHALL additionally maintain a non-sensitive processed_command idempotency-ledger table (site, request_id, command, status, code, summary, changed_keys, occurred_at, config_revision, restart_scheduled, completed_at with an index on completed_at) for the control plane; the ledger SHALL NOT store raw command payloads, SHALL be readable by the Python version (additive schema), and records older than 24 hours SHALL be purged. sqlite_path SHALL be passed to SQLite with Python-equivalent path semantics: an absolute path remains absolute and a relative path is resolved by the process working directory, not by the config-file directory. When the SQLite file cannot be opened the service SHALL print a warning and continue without local backup. All writes SHALL be safe for concurrent worker goroutines.

#### Scenario: Python database is readable and writable

- **WHEN** the Go service points sqlite_path at a database previously written by the Python version
- **THEN** it appends new rows without schema errors and the history command reads old and new rows together

#### Scenario: Disabled storage skips writes

- **WHEN** sqlite_enabled is false
- **THEN** no database file is created or written and the service runs normally


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Anomaly detection parity

The Go implementation SHALL raise a WARN alert when the factory total_power_kw or an individual zone power_kw is zero, negative, missing, or non-numeric continuously for at least daytime_zero_minutes, firing only on the transition and not repeating while the Python `_is_zero` predicate remains true. When night_pause is enabled, the anomaly daytime flag SHALL use the schedule result and night-time readings SHALL reset all windows for that factory without alerts. When night_pause is disabled, the anomaly daytime flag SHALL remain true at every local time, matching Python even during astronomical night. The implementation SHALL raise an INFO recovery alert with the current value on the first positive numeric reading after a fired alert.

#### Scenario: Zero power fires once after threshold

- **WHEN** daytime total power stays at 0 for at least daytime_zero_minutes
- **THEN** exactly one WARN alert is published and recorded
- **AND** no further WARN is emitted while power remains zero

#### Scenario: Recovery emits INFO once

- **WHEN** power becomes positive after a fired zero-power alert
- **THEN** one INFO recovery alert with the value in kW is published and recorded

#### Scenario: Disabled night pause treats night as anomaly daytime

- **WHEN** night_pause is false and a zero reading occurs during astronomical night
- **THEN** the zero window advances exactly as it does during daytime
- **AND** no night reset is applied


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Heartbeat parity

The Go implementation SHALL publish a JSON heartbeat to {prefix}/{factory}/heartbeat immediately when the heartbeat goroutine starts and after each heartbeat_interval wait (minimum 5 seconds), containing ts, boot (process start timestamp), and factory. The heartbeat goroutine SHALL stop immediately when requested. update_settings SHALL update prefix and interval safely but SHALL NOT interrupt the wait already in progress; the new settings SHALL be used by the next loop after the current wait completes, matching Python.

#### Scenario: Heartbeat carries stable boot timestamp

- **WHEN** heartbeats are published across multiple intervals
- **THEN** the boot field stays constant for the process lifetime and ts advances

#### Scenario: First heartbeat publishes before the first interval wait

- **WHEN** the heartbeat goroutine starts
- **THEN** it attempts one heartbeat publication immediately
- **AND** only then waits for heartbeat_interval

#### Scenario: Heartbeat update applies after the current wait

- **WHEN** update_settings changes prefix or interval while the heartbeat goroutine is waiting
- **THEN** the current wait is not interrupted
- **AND** the next heartbeat loop uses the new prefix and interval


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Home Assistant discovery parity

The Go implementation SHALL publish Home Assistant MQTT discovery configs identical in structure to the Python version: per factory three summary sensors and per zone six sensors (power, today, month, total, capacity, hours) with the same unique_id, object_id, state_topic, value_template, unit, device_class, state_class, icon, and device grouping (identifiers ez_solar_{factory_id}). Discovery SHALL be published on the first successful factory round and whenever the ordered zone_id list differs from the previously published list, including a pure reorder. A prefix change SHALL only mark discovery pending; the next successful factory round SHALL republish it. A remove_factory_discovery routine SHALL publish empty retained payloads for all entity config topics.

#### Scenario: Discovery entities match the Python entity set

- **WHEN** discovery runs for a factory with 2 zones
- **THEN** exactly 15 retained config payloads (3 summary + 12 zone sensors) are published under {ha_prefix}/sensor/

#### Scenario: Zone set change republishes

- **WHEN** a new zone id appears in a later round
- **THEN** discovery is republished including the new zone sensors

#### Scenario: Zone reorder republishes

- **WHEN** a later successful round contains the same zone ids in a different order
- **THEN** discovery is republished, matching the Python ordered-list comparison


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Night pause schedule parity

The Go implementation SHALL port the NOAA simplified sunrise/sunset algorithm with timezone offset default 8.0 and -0.83 degree horizon. Workers SHALL scrape during the inclusive daytime interval from (sunrise - night_padding_min) through (sunset + night_padding_min) and SHALL pause outside that interval. During a pause they SHALL publish paused status with seconds until wake and wait until sunrise-padding with a 60-second floor and a 3600-second polar fallback. Indeterminate solar events SHALL be treated as daytime.

#### Scenario: Night time pauses the worker

- **WHEN** the current local time is earlier than sunrise minus padding and night_pause is enabled
- **THEN** the worker publishes a paused status and waits until the computed wake time instead of scraping

#### Scenario: Polar fallback keeps the loop alive

- **WHEN** sunrise cannot be computed for today or tomorrow
- **THEN** seconds_until_sunrise returns 3600 so the loop retries hourly


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Mosquitto lifecycle parity

The Go implementation SHALL optionally start a local mosquitto broker subprocess when mosquitto_path is configured and the target port is not already in use, wait up to 4 seconds for the port to accept connections, pass -c mosquitto_config when the config file exists, and terminate the subprocess on shutdown with a 5-second grace before kill.

#### Scenario: Port already in use skips launch

- **WHEN** mosquitto_path is set but the configured port already accepts connections
- **THEN** no subprocess is started and the existing broker is used


<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->

---
### Requirement: Deployment artifact

The Go implementation SHALL build as Windows/amd64 tray and console binaries with no runtime dependency on Python. It SHALL not produce Linux or macOS distribution artifacts, and it SHALL not include NSSM, install-service, service-install batch files, or a winsvc package.

#### Scenario: Binary runs without Python installed

- **WHEN** the built binary is executed on a clean machine with no Python runtime
- **THEN** all subcommands operate normally

#### Scenario: Windows release targets build without Python

- **WHEN** the Windows release build runs with CGO_ENABLED=0 for windows/amd64
- **THEN** the tray and console executable artifacts are produced without Python or cgo runtime files
- **AND** the release output contains no Linux/macOS artifacts

#### Scenario: NSSM and install-service are absent

- **WHEN** the Windows CLI help and release output are inspected
- **THEN** install-service, NSSM integration, winsvc, install_service.bat, and uninstall_service.bat are absent

<!-- @trace
source: refactor-solar-mqtt-to-go
updated: 2026-08-29
code:
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/assets/tray.ico
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/webui.go
  - start.sh
  - .agents/skills/openspec-apply-change/SKILL.md
  - deploy/mosquitto/solar-collector-control.acl.example
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/db/migrate.ts
  - AGENTS.md
  - solar_mqtt_go/internal/config/config.go
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - .agents/skills/.openspec-target
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricResolver.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/go.sum
  - solar_mqtt_go/go.mod
tests:
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/main_test.go
-->