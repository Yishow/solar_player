# critical-browser-smoke-verification Specification

## Purpose

TBD - created by archiving change 'add-critical-browser-smoke-journeys'. Update Purpose after archive.

## Requirements

### Requirement: Browser smoke runtime is isolated from production state

The browser smoke runner SHALL create a unique temp database, temp image and brand upload directories, deterministic mock data mode, fixed test port, and bounded server process for each run.

#### Scenario: Browser smoke starts

- **WHEN** the operator runs the browser smoke command
- **THEN** no production database, .env file, or upload directory is read or written
- **AND** all child processes and temp runtime paths are cleaned after success or failure


<!-- @trace
source: add-critical-browser-smoke-journeys
updated: 2026-07-14
code:
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/services/deviceLogService.ts
  - playwright.config.ts
  - deploy/deploy.sh
  - apps/server/src/services/releaseIdentityService.ts
  - scripts/generate-release-manifest.mjs
  - scripts/deploy.test.mjs
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/services/api.ts
  - tests/browser/fixtures/runtime.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - deploy/read-solar-display-journal.sh
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - deploy.md
  - deploy.sh
  - package.json
  - scripts/run-browser-smoke.mjs
  - deploy/install-kiosk.sh
tests:
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
-->

---
### Requirement: Draft conflict and publish refresh journey is verified

The browser smoke suite SHALL verify an editor draft save, a stale-version conflict, a successful publish, and playback refresh through the real REST, SQLite, Socket.IO, and router path.

#### Scenario: Stale editor session publishes after conflict resolution

- **WHEN** one browser session saves a newer draft and another session attempts a stale save
- **THEN** the stale save receives the explicit conflict state
- **AND** after reloading the latest draft and publishing, the playback browser renders the published value without a full application restart


<!-- @trace
source: add-critical-browser-smoke-journeys
updated: 2026-07-14
code:
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/services/deviceLogService.ts
  - playwright.config.ts
  - deploy/deploy.sh
  - apps/server/src/services/releaseIdentityService.ts
  - scripts/generate-release-manifest.mjs
  - scripts/deploy.test.mjs
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/services/api.ts
  - tests/browser/fixtures/runtime.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - deploy/read-solar-display-journal.sh
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - deploy.md
  - deploy.sh
  - package.json
  - scripts/run-browser-smoke.mjs
  - deploy/install-kiosk.sh
tests:
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
-->

---
### Requirement: Image governance and fallback journey is verified

The browser smoke suite SHALL verify image upload, playlist inclusion, Images playback, and configured missing-asset fallback through the real application boundary.

#### Scenario: Published image becomes unavailable

- **WHEN** a valid uploaded image is included in the playlist and then made unavailable in the isolated fixture
- **THEN** Images playback does not render a broken or blank stage
- **AND** it applies the configured fallback behavior


<!-- @trace
source: add-critical-browser-smoke-journeys
updated: 2026-07-14
code:
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/services/deviceLogService.ts
  - playwright.config.ts
  - deploy/deploy.sh
  - apps/server/src/services/releaseIdentityService.ts
  - scripts/generate-release-manifest.mjs
  - scripts/deploy.test.mjs
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/services/api.ts
  - tests/browser/fixtures/runtime.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - deploy/read-solar-display-journal.sh
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - deploy.md
  - deploy.sh
  - package.json
  - scripts/run-browser-smoke.mjs
  - deploy/install-kiosk.sh
tests:
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
-->

---
### Requirement: Data-mode readiness and live refresh journey is verified

The browser smoke suite SHALL verify a data-mode change, readiness and rotation-plan recalculation, skip-reason behavior, and live metric refresh.

#### Scenario: Mock mode becomes ready

- **WHEN** the isolated runtime switches to deterministic mock mode
- **THEN** readiness and rotation APIs report the expected playable pages
- **AND** a subsequent live metric event updates the visible playback value


<!-- @trace
source: add-critical-browser-smoke-journeys
updated: 2026-07-14
code:
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/services/deviceLogService.ts
  - playwright.config.ts
  - deploy/deploy.sh
  - apps/server/src/services/releaseIdentityService.ts
  - scripts/generate-release-manifest.mjs
  - scripts/deploy.test.mjs
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/services/api.ts
  - tests/browser/fixtures/runtime.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - deploy/read-solar-display-journal.sh
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - deploy.md
  - deploy.sh
  - package.json
  - scripts/run-browser-smoke.mjs
  - deploy/install-kiosk.sh
tests:
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
-->

---
### Requirement: Playback survives reload and socket reconnect

The browser smoke suite SHALL verify application reload and Socket.IO reconnect without a persistent blank playback stage.

#### Scenario: Playback browser reconnects

- **WHEN** the playback browser reloads and the Socket.IO connection is interrupted once
- **THEN** the playback shell remains visible during recovery
- **AND** the playback route resumes live updates after reconnect without an application restart


<!-- @trace
source: add-critical-browser-smoke-journeys
updated: 2026-07-14
code:
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/services/deviceLogService.ts
  - playwright.config.ts
  - deploy/deploy.sh
  - apps/server/src/services/releaseIdentityService.ts
  - scripts/generate-release-manifest.mjs
  - scripts/deploy.test.mjs
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/services/api.ts
  - tests/browser/fixtures/runtime.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - deploy/read-solar-display-journal.sh
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - deploy.md
  - deploy.sh
  - package.json
  - scripts/run-browser-smoke.mjs
  - deploy/install-kiosk.sh
tests:
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
-->

---
### Requirement: Failed journeys retain bounded evidence

Each failed browser journey SHALL retain a screenshot, browser console log, network summary, and server log under a run-specific artifact directory.

#### Scenario: Journey assertion fails

- **WHEN** a browser smoke assertion fails
- **THEN** the command exits nonzero
- **AND** its output prints the artifact directory containing all four evidence types

<!-- @trace
source: add-critical-browser-smoke-journeys
updated: 2026-07-14
code:
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/services/deviceLogService.ts
  - playwright.config.ts
  - deploy/deploy.sh
  - apps/server/src/services/releaseIdentityService.ts
  - scripts/generate-release-manifest.mjs
  - scripts/deploy.test.mjs
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/services/api.ts
  - tests/browser/fixtures/runtime.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - deploy/read-solar-display-journal.sh
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - deploy.md
  - deploy.sh
  - package.json
  - scripts/run-browser-smoke.mjs
  - deploy/install-kiosk.sh
tests:
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
-->