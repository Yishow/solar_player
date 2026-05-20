# energy-history-range-semantics Specification

## Purpose

TBD - created by archiving change 'correct-energy-history-year-range-and-summary-contract'. Update Purpose after archive.

## Requirements

### Requirement: Treat year as a distinct Energy History range

The system SHALL treat `year` as a distinct `Energy History` range instead of aliasing it to `total`.

#### Scenario: Operator opens the year tab

- **WHEN** the operator selects the `year` tab in `Energy History`
- **THEN** the page SHALL request and render data for the current calendar year only
- **AND** it SHALL NOT relabel cumulative data as if it were annual data

##### Example: Year and total remain different periods

| Range | Snapshot period | Summary period | Counter semantics |
| ----- | --------------- | -------------- | ----------------- |
| `year` | current calendar year | current calendar year | not treated as total-only source |
| `total` | full retained history | full retained history | cumulative counters allowed |


<!-- @trace
source: correct-energy-history-year-range-and-summary-contract
updated: 2026-05-20
code:
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - AGENTS.md
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - CLAUDE.md
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/server/src/logger.ts
  - package.json
  - apps/server/src/routes/device.ts
  - scripts/dev.mjs
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/services/api.ts
tests:
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
-->

---
### Requirement: Keep Energy History summaries consistent with the selected range

The system SHALL keep `Energy History` summary cards, table rows, and chart labels consistent with the selected period contract.

#### Scenario: Annual summary stays aligned with annual chart data

- **WHEN** `Energy History` renders the `year` range
- **THEN** the summary cards and table rows SHALL describe the same annual period shown by the chart data
- **AND** the page SHALL NOT mix annual labels with cumulative totals in the same range state

##### Example: Year summary does not reuse total counters

- **GIVEN** the cumulative counters include multiple years of retained data
- **WHEN** the operator views the `year` range
- **THEN** the page uses the current year's summaries and snapshots for annual labels
- **AND** cumulative-only counters remain reserved for the `total` range

<!-- @trace
source: correct-energy-history-year-range-and-summary-contract
updated: 2026-05-20
code:
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - AGENTS.md
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - CLAUDE.md
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/server/src/logger.ts
  - package.json
  - apps/server/src/routes/device.ts
  - scripts/dev.mjs
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/services/api.ts
tests:
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
-->