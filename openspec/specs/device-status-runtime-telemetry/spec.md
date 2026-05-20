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