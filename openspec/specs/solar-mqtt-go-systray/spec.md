# solar-mqtt-go-systray Specification

## Purpose

TBD - created by archiving change 'add-solar-mqtt-go-systray'. Update Purpose after archive.

## Requirements

### Requirement: Tray mode entry and single instance

The Windows Go binary SHALL provide a tray subcommand that runs the scraper service in-process together with a Windows system tray icon. Starting the Windows tray binary with no arguments SHALL enter tray mode. A second tray instance on the same machine SHALL detect the first instance and exit immediately without disturbing it.

#### Scenario: Windows no-args starts in tray

- **WHEN** the windowsgui-built binary is double-clicked or started with no arguments on Windows
- **THEN** no console window appears and the tray icon appears with the service running

#### Scenario: second instance exits immediately

- **WHEN** a second tray instance is started while one is running
- **THEN** the second instance exits with a message and the first instance keeps running

#### Scenario: unavailable tray fails explicitly

- **WHEN** tray mode is requested from a Windows build without tray support
- **THEN** the process prints an error and exits with a non-zero status without falling back to run mode


<!-- @trace
source: add-solar-mqtt-go-systray
updated: 2026-08-29
code:
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/tray/instance_unix.go
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - start.sh
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/scraper/scraper.go
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/server/src/services/displayValueOverrideService.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - solar_mqtt_go/internal/service/control.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/MetricResolver.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/go.sum
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/routes/settings-mqtt.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/assets/tray.ico
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/start.sh
  - docs/runbooks/pc-server-deploy.md
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/tray/instance_windows.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/tray/run.go
  - AGENTS.md
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/services/scopedMetricResolver.ts
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/start.ps1
  - apps/server/src/db/migrate.ts
  - start.ps1
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/go.mod
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
tests:
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/main_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
-->

---
### Requirement: Tray menu actions

The tray icon's context menu SHALL provide, at minimum: open webpage, a checked pause/resume toggle for the scraper service, open folder (the executable directory), and quit. Quit SHALL stop the in-process service and the embedded web server gracefully before exiting. Toggling pause SHALL stop the factory workers without exiting the process, and resume SHALL restart them; the menu label SHALL reflect the current state.

#### Scenario: open webpage launches browser

- **WHEN** the user selects open webpage
- **THEN** the system default browser opens the embedded dashboard URL

#### Scenario: pause stops workers, resume restarts them

- **WHEN** the user toggles pause on
- **THEN** factory workers stop (no further MQTT data publications) while the process stays alive
- **AND** toggling pause off restarts the workers and unchecks the item

#### Scenario: quit shuts down gracefully

- **WHEN** the user selects quit
- **THEN** the service stops (status stopped published), the web server stops, and the process exits 0

#### Scenario: open folder reveals executable directory

- **WHEN** the user selects open folder
- **THEN** the platform file manager opens the executable's directory


<!-- @trace
source: add-solar-mqtt-go-systray
updated: 2026-08-29
code:
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/tray/instance_unix.go
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - start.sh
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/scraper/scraper.go
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/server/src/services/displayValueOverrideService.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - solar_mqtt_go/internal/service/control.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/MetricResolver.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/go.sum
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/routes/settings-mqtt.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/assets/tray.ico
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/start.sh
  - docs/runbooks/pc-server-deploy.md
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/tray/instance_windows.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/tray/run.go
  - AGENTS.md
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/services/scopedMetricResolver.ts
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/start.ps1
  - apps/server/src/db/migrate.ts
  - start.ps1
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/go.mod
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
tests:
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/main_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
-->

---
### Requirement: Embedded local dashboard server

Tray mode SHALL serve the bundled dashboard assets over HTTP on 127.0.0.1 only, on a configurable port (default 18868), using go:embed so the assets ship inside the single binary. The server SHALL NOT listen on external interfaces. The open webpage action SHALL target this server's dashboard URL.

#### Scenario: dashboard served from embedded assets

- **WHEN** the browser requests the dashboard URL while tray mode is running
- **THEN** index.html and its assets are served from the embedded copy with 200 responses

#### Scenario: server binds loopback only

- **WHEN** the embedded server starts
- **THEN** its listener is bound to 127.0.0.1 and not reachable from other hosts

#### Scenario: dashboard startup failure aborts tray

- **WHEN** the embedded dashboard server cannot start
- **THEN** tray mode exits with a non-zero status before initializing the tray, without advertising a dashboard URL


<!-- @trace
source: add-solar-mqtt-go-systray
updated: 2026-08-29
code:
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/tray/instance_unix.go
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - start.sh
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/scraper/scraper.go
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/server/src/services/displayValueOverrideService.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - solar_mqtt_go/internal/service/control.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/MetricResolver.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/go.sum
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/routes/settings-mqtt.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/assets/tray.ico
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/start.sh
  - docs/runbooks/pc-server-deploy.md
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/tray/instance_windows.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/tray/run.go
  - AGENTS.md
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/services/scopedMetricResolver.ts
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/start.ps1
  - apps/server/src/db/migrate.ts
  - start.ps1
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/go.mod
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
tests:
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/main_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
-->

---
### Requirement: Embedded dashboard subscription visibility

The embedded dashboard SHALL show an MQTT subscription section with separate KN and CL topic lists. The displayed topics SHALL be generated from the same `factoryDataTopics(prefix, factoryId)` function used by subscription and unsubscription calls; a second static topic list SHALL NOT exist. The section SHALL distinguish `not-subscribed` from `subscription-sent`, SHALL update when the active prefix changes, and SHALL NOT render broker credentials.

#### Scenario: KN and CL show the requested subscription topics

- **WHEN** the dashboard is loaded with active prefix `solar`
- **THEN** the subscription section shows separate KN and CL lists whose entries are the topics returned by `factoryDataTopics("solar", "KN")` and `factoryDataTopics("solar", "CL")`
- **AND** the lists contain no username or password values

#### Scenario: subscription status distinguishes pending and sent

- **WHEN** the browser is disconnected or has not yet dispatched its factory subscriptions
- **THEN** both factory lists show `not-subscribed`
- **WHEN** the MQTT connect handler dispatches the topics returned by `factoryDataTopics` to `client.subscribe`
- **THEN** both factory lists show `subscription-sent`

#### Scenario: prefix change replaces visible topics and subscriptions

- **WHEN** the active prefix changes from `solar` to `plant`
- **THEN** the browser unsubscribes topics generated by `factoryDataTopics("solar", factoryId)` for KN and CL
- **AND** the visible lists and new subscribe calls use only topics generated by `factoryDataTopics("plant", factoryId)`

#### Scenario: subscription display does not expose credentials

- **WHEN** broker connection inputs contain a username and password
- **THEN** the subscription section displays topic paths and subscription state only, without either credential or its value


<!-- @trace
source: add-solar-mqtt-go-systray
updated: 2026-08-29
code:
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/tray/instance_unix.go
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - start.sh
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/scraper/scraper.go
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/server/src/services/displayValueOverrideService.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - solar_mqtt_go/internal/service/control.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/MetricResolver.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/go.sum
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/routes/settings-mqtt.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/assets/tray.ico
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/start.sh
  - docs/runbooks/pc-server-deploy.md
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/tray/instance_windows.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/tray/run.go
  - AGENTS.md
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/services/scopedMetricResolver.ts
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/start.ps1
  - apps/server/src/db/migrate.ts
  - start.ps1
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/go.mod
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
tests:
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/main_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
-->

---
### Requirement: Windows build outputs and windowless tray delivery

The repo build script SHALL produce only statically linked CGO_ENABLED=0 Windows tray and console executables. The Windows tray output SHALL use the GUI subsystem (no console window). In tray mode, stdout and stderr SHALL be appended to solar.log next to the executable so service output remains diagnosable. CLI subcommands (run/once/test-login/test-mqtt/dump-api/history/alerts/--once) SHALL remain unchanged and SHALL NOT be routed through the log redirection.

#### Scenario: windows build shows no console

- **WHEN** the Windows binary from the build script is launched
- **THEN** no console window appears

#### Scenario: tray output lands in solar.log

- **WHEN** tray mode runs and the service prints a fetch result
- **THEN** the output is appended to solar.log next to the executable

#### Scenario: CLI subcommands unaffected

- **WHEN** any CLI subcommand is invoked from a terminal
- **THEN** output goes to the terminal as before, not to solar.log

#### Scenario: non-Windows distribution is absent

- **WHEN** `build_dist.sh` completes
- **THEN** no macOS app, darwin executable, or Linux executable is created in `dist/`

<!-- @trace
source: add-solar-mqtt-go-systray
updated: 2026-08-29
code:
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - solar_mqtt_go/internal/tray/instance_unix.go
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - scripts/deploy.test.mjs
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - start.sh
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/scraper/scraper.go
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/server/src/services/displayValueOverrideService.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - solar_mqtt_go/internal/discovery/discovery.go
  - solar_mqtt_go/internal/service/control.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - solar_mqtt_go/internal/webui/web/index.html
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/services/MetricResolver.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - solar_mqtt_go/go.sum
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/main.go
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/routes/settings-mqtt.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/assets/tray.ico
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/storage/storage.go
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/start.sh
  - docs/runbooks/pc-server-deploy.md
  - solar_mqtt_go/internal/mqttbus/bus.go
  - solar_mqtt_go/internal/tray/instance_windows.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/internal/tray/run.go
  - AGENTS.md
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/display/display.go
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/server/src/services/scopedMetricResolver.ts
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/start.ps1
  - apps/server/src/db/migrate.ts
  - start.ps1
  - .agents/skills/openspec-archive-change/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/go.mod
  - .agents/skills/openspec-apply-change/SKILL.md
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
tests:
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/build_test.go
  - solar_mqtt_go/internal/tray/app_test.go
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/tray/logfile_test.go
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - solar_mqtt_go/main_test.go
  - solar_mqtt_go/internal/config/applyset_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/services/MetricResolver.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
-->
