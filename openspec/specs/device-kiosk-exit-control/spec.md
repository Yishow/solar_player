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

---
### Requirement: Install a concrete desktop re-entry target for kiosk exit guidance

The system SHALL back kiosk exit re-entry guidance with an installed desktop launcher named `Solar Display Kiosk` for the kiosk user.

#### Scenario: Kiosk exit guidance has an installed desktop target

- **WHEN** the kiosk installer completes for user `kz`
- **THEN** the user's desktop SHALL contain a `Solar Display Kiosk` launcher
- **AND** the launcher SHALL invoke the fixed kiosk start helper
- **AND** the Device Status kiosk exit guidance SHALL name the same launcher

#### Scenario: Re-entry target is missing during verification

- **WHEN** the kiosk verification command runs and the desktop launcher is missing
- **THEN** verification SHALL fail
- **AND** it SHALL report that Device Status re-entry guidance is not backed by an installed desktop launcher

<!-- @trace
source: harden-raspberry-pi-kiosk-readonly-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/app/router.tsx
  - deploy/firefox-kiosk.desktop
  - deploy/install-kiosk.sh
  - docs/README.md
  - deploy/raspi-bootstrap.sh
  - apps/server/src/services/MockMetricsFeedService.ts
  - deploy/solar-display.service
  - apps/server/src/services/displayStoryService.ts
  - deploy/readonly-system-enable.sh
  - apps/server/src/services/deviceKioskExitService.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/services/api.ts
  - deploy/apply-desktop-theme.sh
  - deploy/repair-kiosk-system.sh
  - .env.example
  - apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts
  - apps/server/src/routes/device.ts
  - scripts/deploy.test.mjs
  - deploy.md
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - packages/shared/src/displayStory.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - deploy/verify-kiosk-install.sh
  - apps/web/src/pages/Overview/overview.css
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Solar/index.tsx
  - scripts/prepare-raspi-user-data.ps1
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/plugins/managementAuth.ts
  - deploy/enable-readonly-system.desktop
  - apps/server/src/app.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - scripts/dev-lib.mjs
  - docs/runbooks/device-diagnostics-safe-ops.md
  - README.md
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - deploy.sh
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/mocks/weather.ts
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - deploy/disable-display-sleep.sh
  - scripts/dev-lib.d.mts
  - packages/shared/src/types.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - deploy/start-solar-kiosk.sh
  - scripts/dev.test.mjs
  - apps/server/src/env.ts
  - scripts/connect-raspi-rdp.ps1
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - deploy/configure-lightweight-desktop.sh
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/web/src/pages/Images/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/data-source.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - deploy/disable-readonly-system.desktop
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/routes/calculation-settings.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/server/src/services/calculationSettingsService.ts
  - packages/shared/src/householdEquivalence.ts
  - scripts/dev.mjs
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/server/src/routes/display-story.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/app/router.test.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->