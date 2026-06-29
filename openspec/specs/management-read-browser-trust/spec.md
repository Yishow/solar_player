# management-read-browser-trust Specification

## Purpose

TBD - created by archiving change 'fix-mqtt-save-and-overview-trend-ops'. Update Purpose after archive.

## Requirements

### Requirement: Trust same-host browser referer for read-only management requests
The system SHALL allow a read-only management request to pass trusted-browser access when the request omits `Origin` but includes a same-host `Referer`.

#### Scenario: Same-host browser GET omits Origin
- **WHEN** a browser sends a GET request to a read-only management endpoint without an `Origin` header
- **AND** the `Referer` host matches the current request host
- **THEN** the management read check SHALL treat the request as trusted
- **AND** the endpoint SHALL return its normal diagnostics payload

#### Scenario: Cross-host referer remains denied
- **WHEN** a browser sends a GET request to a read-only management endpoint without an `Origin` header
- **AND** the `Referer` host does not match the current request host
- **THEN** the management read check SHALL deny the request
- **AND** the denial SHALL NOT broaden write access rules

<!-- @trace
source: fix-mqtt-save-and-overview-trend-ops
updated: 2026-06-29
code:
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/data-source.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/server/src/routes/settings-mqtt.ts
tests:
  - apps/server/src/routes/data-source.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
-->