# device-kiosk-exit-control Specification

## Purpose

TBD - created by archiving change 'add-overview-group-style-controls-and-kiosk-exit'. Update Purpose after archive.

## Requirements

### Requirement: Execute kiosk exit through a fixed host helper

The system SHALL execute kiosk exit through a fixed server-side helper instead of a browser-only close attempt or an arbitrary host command surface.

#### Scenario: Trusted operator exits kiosk successfully

- **WHEN** a trusted management operator confirms the kiosk exit action
- **THEN** the server invokes the fixed kiosk stop helper
- **AND** the response reports a successful exit result with re-entry guidance for `Solar Display Kiosk`

#### Scenario: Fixed helper is unavailable or fails

- **WHEN** the kiosk stop helper is missing, not executable, or returns a failure
- **THEN** the server returns a failure result
- **AND** the client keeps the current page visible and shows the failure instead of pretending the kiosk was closed


<!-- @trace
source: add-overview-group-style-controls-and-kiosk-exit
updated: 2026-06-10
code:
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/vite.config.ts
  - apps/web/src/devtools/reactGrabBootstrapTarget.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - deploy/reset-db-settings.sh
  - deploy/start-solar-kiosk.sh
  - apps/web/package.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - scripts/deploy.test.mjs
  - deploy/stop-solar-kiosk.sh
  - apps/server/src/services/deviceKioskExitService.ts
  - deploy/firefox-kiosk.desktop
  - apps/web/src/main.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/devtools/reactGrabNoop.ts
  - deploy.sh
  - deploy/export-runtime-state.sh
  - apps/web/tsconfig.json
  - deploy/solar-display.service
  - apps/web/src/devtools/reactGrabBootstrap.ts
  - apps/web/src/services/api.ts
  - deploy/install-kiosk.sh
tests:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/devtools/reactGrabBootstrapTarget.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->

---
### Requirement: Keep kiosk exit bounded to the known action contract

The system SHALL expose kiosk exit as a dedicated action contract, and the server SHALL NOT accept arbitrary process names, commands, or free-form shell input from the client.

#### Scenario: Client attempts to send arbitrary command input

- **WHEN** the client calls the kiosk exit endpoint
- **THEN** the endpoint only evaluates the fixed kiosk exit action
- **AND** it ignores or rejects arbitrary command parameters outside the defined contract

#### Scenario: Untrusted request attempts kiosk exit

- **WHEN** a request does not satisfy the existing trusted management boundary
- **THEN** the kiosk exit action is denied
- **AND** the response does not expose host execution details beyond the normal denial envelope

<!-- @trace
source: add-overview-group-style-controls-and-kiosk-exit
updated: 2026-06-10
code:
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/vite.config.ts
  - apps/web/src/devtools/reactGrabBootstrapTarget.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - deploy/reset-db-settings.sh
  - deploy/start-solar-kiosk.sh
  - apps/web/package.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - scripts/deploy.test.mjs
  - deploy/stop-solar-kiosk.sh
  - apps/server/src/services/deviceKioskExitService.ts
  - deploy/firefox-kiosk.desktop
  - apps/web/src/main.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/devtools/reactGrabNoop.ts
  - deploy.sh
  - deploy/export-runtime-state.sh
  - apps/web/tsconfig.json
  - deploy/solar-display.service
  - apps/web/src/devtools/reactGrabBootstrap.ts
  - apps/web/src/services/api.ts
  - deploy/install-kiosk.sh
tests:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/devtools/reactGrabBootstrapTarget.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->