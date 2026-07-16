# device-status-runtime-telemetry Specification

## Purpose

TBD - created by archiving change 'harden-device-status-logs-diagnostics-and-telemetry-runtime'. Update Purpose after archive.

## Requirements

### Requirement: Show only trusted runtime telemetry in Device Status

The system SHALL show only measured runtime telemetry or an explicit unavailable state in `Device Status`.

#### Scenario: Telemetry source is unavailable

- **WHEN** a `Device Status` telemetry card cannot be backed by a real runtime measurement
- **THEN** the page SHALL show an explicit unavailable or unsupported state for that card
- **AND** it SHALL NOT substitute a hard-coded telemetry value as if it were measured data

##### Example: Temperature is unavailable instead of invented

- **GIVEN** the server has no trusted device temperature source
- **WHEN** the operator opens `Device Status`
- **THEN** the temperature card shows an unavailable state
- **AND** the page does not display an invented fixed temperature such as `52°C`

<!-- @trace
source: harden-device-status-logs-diagnostics-and-telemetry-runtime
updated: 2026-05-20
code:
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - package.json
  - apps/server/src/services/deviceDisplayOpsService.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/routes/metrics-history.ts
  - apps/server/src/logger.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - CLAUDE.md
  - apps/web/src/services/api.ts
  - AGENTS.md
tests:
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
-->

---
### Requirement: Surface Pi 5 host resources with on-demand low-overhead telemetry

The system SHALL present CPU load, memory usage, disk usage, system temperature, and fan status on Device Status from telemetry gathered on demand by the existing device status request, and it SHALL NOT require a background collector, telemetry persistence, MQTT publication, or a new periodic browser poll.

#### Scenario: Trusted operator opens Device Status on a Pi 5

- **WHEN** a trusted management caller requests Device Status on a Pi 5 with readable procfs and sysfs telemetry
- **THEN** the response SHALL include the existing CPU, memory, and disk telemetry together with measured system temperature and fan telemetry
- **AND** the page SHALL render the system temperature and fan status from that response

#### Scenario: Fan RPM is exposed by the host

- **WHEN** the Pi 5 host exposes a readable numeric fan RPM value
- **THEN** the device status response SHALL report that measured RPM
- **AND** the page SHALL identify the fan as running when the RPM is greater than zero and stopped when it is zero

#### Scenario: Only a cooling state is exposed by the host

- **WHEN** the Pi 5 host does not expose fan RPM but exposes a readable pwm-fan cooling state
- **THEN** the device status response SHALL report the measured cooling state without inventing an RPM value
- **AND** the page SHALL distinguish a positive running state from a zero stopped state

#### Scenario: Temperature or fan telemetry is unavailable

- **WHEN** a temperature or fan source is missing, unreadable, or unparsable
- **THEN** the affected telemetry field SHALL be explicitly unavailable with a null measured value
- **AND** the status request SHALL continue returning the other available host telemetry
- **AND** the page SHALL NOT present zero or a fixed placeholder as a measured hardware value

#### Scenario: No background monitoring work is introduced

- **WHEN** no trusted caller requests Device Status
- **THEN** the application SHALL perform no temperature or fan sampling for this capability
- **AND** it SHALL perform no telemetry database writes or MQTT publications for this capability

<!-- @trace
source: surface-pi5-system-resources-on-device-status
updated: 2026-07-16
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/pi5-deployment/SKILL.md
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - deploy.md
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/FactoryCircuit/layout.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - deploy/raspi-bootstrap.sh
  - apps/server/src/routes/device.ts
  - scripts/deploy.test.mjs
  - apps/server/src/services/DailySummaryService.ts
tests:
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/FactoryCircuit/layout.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
-->