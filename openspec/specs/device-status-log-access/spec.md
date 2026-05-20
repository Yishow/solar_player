# device-status-log-access Specification

## Purpose

TBD - created by archiving change 'harden-device-status-logs-diagnostics-and-telemetry-runtime'. Update Purpose after archive.

## Requirements

### Requirement: Provide ESM-safe Device Status log access

The system SHALL provide recent log listing and export metadata for `Device Status` through routes that remain safe to call in the current server runtime.

#### Scenario: Operator reads recent logs

- **WHEN** the operator requests recent device logs from `Device Status`
- **THEN** the server SHALL return a safe listing of recent log files or a bounded error envelope
- **AND** the route SHALL remain callable in the current Node ESM server runtime

##### Example: Missing log directory returns a safe error

- **GIVEN** the configured log directory does not exist
- **WHEN** the operator requests log export metadata
- **THEN** the API returns the existing safe error envelope for missing logs
- **AND** the route does not fail because of an incompatible module access pattern

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