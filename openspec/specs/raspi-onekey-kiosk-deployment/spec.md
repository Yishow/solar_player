# raspi-onekey-kiosk-deployment Specification

## Purpose

TBD - created by archiving change 'add-raspi-onekey-kiosk-deploy'. Update Purpose after archive.

## Requirements

### Requirement: Provide a local Raspberry Pi kiosk deployment entrypoint

The system SHALL provide a local deployment command that targets a Raspberry Pi over SSH, builds or selects a deploy bundle, uploads the bundle, invokes target-side bootstrap, protects existing runtime state before an update, applies an operation-selected hotspot policy when requested, restarts the service, and reports verification and recovery results.

#### Scenario: Operator starts an update deployment

- **WHEN** an operator runs the Raspberry Pi deployment entrypoint with the operation-time `SSH_TARGET` in update mode
- **THEN** the command verifies SSH reachability and sudo access before uploading files
- **AND** it prints the target, mode, install directory, bundle type, MQTT host setting, readonly-root setting, and hotspot policy inputs before making target changes
- **AND** it prints the kiosk user derived from the SSH target or explicit override before making target changes
- **AND** target-side bootstrap stops the active service and creates a verified runtime backup before replacing application files
- **AND** a backup failure stops the update before application replacement
- **AND** it forwards the hotspot connection id, scan SSID, and integer priority to target bootstrap when hotspot management is requested
- **AND** the final output reports the backup path and recovery command

#### Scenario: Dry run reports planned stages without target changes

- **WHEN** an operator runs the deployment entrypoint with dry-run enabled
- **THEN** the command prints the local and remote stages that would run, including backup verification, hotspot policy configuration when requested, and recovery handoff
- **AND** it does not upload a bundle, create a backup, install packages, change NetworkManager profiles, install or enable systemd units, restart services, edit partitions, or enable readonly root


<!-- @trace
source: persist-pi5-hotspot-priority-and-deployment-skill
updated: 2026-07-16
code:
  - deploy.sh
  - .agents/skills/pi5-deployment/agents/openai.yaml
  - apps/server/src/services/DailySummaryService.ts
  - deploy/verify-kiosk-install.sh
  - scripts/deploy.test.mjs
  - deploy.md
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - deploy/raspi-bootstrap.sh
  - deploy/configure-hotspot-priority.sh
  - apps/web/src/pages/FactoryCircuit/layout.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - scripts/raspi-onekey-deploy.sh
  - .agents/skills/pi5-deployment/SKILL.md
  - apps/server/src/services/MockMetricsFeedService.ts
tests:
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/FactoryCircuit/layout.test.ts
-->

---
### Requirement: Prepare first-boot user-data with an interactive menu

The system SHALL provide macOS/Linux and Windows helpers that prepare Ubuntu Raspberry Pi `system-boot/user-data` without requiring the operator to remember cloud-init YAML.

#### Scenario: Interactive defaults create a pi sudo SSH user

- **WHEN** an operator runs the user-data helper without arguments
- **THEN** the helper prompts for the boot path, hostname, Linux user, user password, root password, timezone, package upgrade choice, and final confirmation
- **AND** accepting defaults writes cloud-init for user `pi`, password `pi`, sudo group membership, `openssh-server`, `sudo`, `avahi-daemon`, SSH password auth enabled, first-boot root auto-grow disabled, and root SSH login disabled

#### Scenario: Root auto-grow is disabled before first boot

- **WHEN** the helper writes `user-data` for a fresh production card
- **THEN** the generated cloud-init disables `growpart` and root filesystem resize
- **AND** it writes a growroot-disabled marker so the card keeps free space for `/data` creation during init deploy

#### Scenario: Existing user-data is backed up

- **WHEN** the target boot partition already contains `user-data`
- **THEN** the helper copies it to `user-data.before-solar-player` before writing the Solar Player cloud-init file

#### Scenario: Project-specific user can be explicit

- **WHEN** an operator passes a user such as `kz`
- **THEN** the helper writes that user into cloud-init instead of the generic `pi` default

#### Scenario: Interactive helper records data partition size

- **WHEN** an operator runs the user-data helper without arguments
- **THEN** the helper prompts for the target `/data` partition size
- **AND** accepting defaults writes a boot-partition deploy environment file with `DATA_SIZE_GB=10`
- **AND** entering another positive integer writes that value instead

#### Scenario: Init deploy reads first-boot deploy environment

- **WHEN** init deployment runs after the user-data helper wrote `/boot/firmware/solar-deploy.env`
- **THEN** the deployment entrypoint reads `DATA_SIZE_GB` and `MQTT_HOST` from that file when the operator did not pass explicit CLI values
- **AND** explicit `--data-size-gb` or `--mqtt-host` values take precedence over the boot-partition deploy environment

#### Scenario: First-login maintenance tools script is written

- **WHEN** an operator accepts the first-login tools option
- **THEN** the helper writes an executable `solar-first-login-tools.sh` script to the boot partition
- **AND** the script installs minimum maintenance tools and nvm for the selected kiosk user
- **AND** the script is safe to rerun without changing SSH or sudo authentication policy


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Keep daily update deployments non-destructive

The system SHALL support a daily update mode that updates the application deployment while preserving target runtime state and without changing disk partitions.

#### Scenario: Update deployment preserves runtime state

- **WHEN** an operator runs update mode against a target with an existing install directory
- **THEN** the deployment preserves the target `.env`, data directory, logs directory, image uploads directory, and brand uploads directory
- **AND** it updates application files and deploy helpers needed by the current bundle

#### Scenario: Update mode refuses disk initialization

- **WHEN** an operator runs update mode
- **THEN** the deployment does not run disk partition creation, disk resizing, filesystem formatting, or mount table creation commands
- **AND** it fails if the required `/data` runtime mount or install directory prerequisites are missing


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Gate new-card disk initialization behind detected layout and confirmation

The system SHALL gate new-card disk initialization behind explicit layout detection, safe-case checks, and operator confirmation.

#### Scenario: Init mode displays disk choices

- **WHEN** an operator runs init mode on a Raspberry Pi target
- **THEN** the bootstrap prints the detected disk name, total disk size, partition list, filesystem labels, mountpoints, root partition size, and `/data` mount status
- **AND** it presents root-size and `/data` layout choices before performing disk changes

#### Scenario: Data partition defaults to ten GiB

- **WHEN** init mode creates `/data` on a fresh card without an explicit root-size override
- **THEN** it allocates `/data` as 10GiB
- **AND** it expands root to use the remaining leading disk space

#### Scenario: Existing writable data mount is reused

- **WHEN** init mode detects an existing writable `/data` mount
- **THEN** it offers to reuse `/data`
- **AND** reusing `/data` does not format, resize, or repartition the disk

#### Scenario: Root-full layout is rejected

- **WHEN** init mode detects that the root partition consumes the full disk and `/data` is absent
- **THEN** it exits non-zero with a message explaining that online root shrink is not supported
- **AND** it does not run partition shrink, filesystem shrink, formatting, or mount table modification commands


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Install and verify kiosk runtime on Ubuntu 24.04 Raspberry Pi

The system SHALL install and verify the runtime prerequisites for the Solar Display kiosk on Ubuntu 24.04 arm64 Raspberry Pi targets.

#### Scenario: Supported host passes preflight

- **WHEN** bootstrap runs on Ubuntu 24.04 arm64 with sudo access
- **THEN** it accepts the host as a supported target
- **AND** it verifies or installs the required runtime pieces for Node, pnpm, Firefox, the Solar Display service, kiosk launcher helpers, and desktop re-entry launcher

#### Scenario: Unsupported host is rejected

- **WHEN** bootstrap runs on a host that is not Ubuntu 24.04 arm64 or lacks sudo access
- **THEN** it exits non-zero before installing packages or changing service configuration
- **AND** it prints the unsupported OS, architecture, or sudo check that failed


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Configure lightweight XFCE RDP without weakening SSH or sudo

The system SHALL support lightweight remote desktop setup with XFCE and xrdp, and RDP passwordless access SHALL NOT disable SSH password authentication or sudo password prompts.

#### Scenario: XFCE xrdp desktop Firefox browser and lightdm autologin are installed

- **WHEN** bootstrap runs with desktop mode set to `xfce-xrdp`
- **THEN** it verifies or installs XFCE, lightdm, xrdp, xorgxrdp, Firefox, and the kiosk user's XFCE session file
- **AND** it enables the xrdp service for remote desktop access
- **AND** it configures lightdm to autologin the kiosk user for the local desktop

#### Scenario: RDP passwordless is limited to the kiosk desktop

- **WHEN** bootstrap runs with RDP auth mode set to `passwordless`
- **THEN** it configures xrdp to enter the kiosk user's XFCE desktop without prompting the RDP operator for a password
- **AND** it does not disable SSH password authentication
- **AND** it does not add sudo passwordless rules

#### Scenario: RDP passwordless requires a password source

- **WHEN** bootstrap runs with RDP auth mode set to `passwordless` and no kiosk password source is provided
- **THEN** it exits non-zero before changing xrdp configuration
- **AND** it explains that SSH and sudo remain password-protected


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Preserve MQTT defaults without overwriting target configuration

The system SHALL allow first-install MQTT defaults to be supplied during deployment while preserving an existing target `.env` file.

#### Scenario: First install writes MQTT default

- **WHEN** deployment runs with an MQTT host value and the target install directory has no `.env`
- **THEN** the generated `.env` contains the supplied MQTT broker host value
- **AND** the deployment prints that it created the target `.env`

#### Scenario: Existing env is preserved

- **WHEN** deployment runs with an MQTT host value and the target install directory already has `.env`
- **THEN** the deployment preserves the existing `.env` file unchanged
- **AND** it prints that MQTT defaults were not overwritten


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Gate readonly root apply behind successful verification

The system SHALL keep readonly root hardening as an explicit optional apply step that can run only after service and kiosk verification succeed.

#### Scenario: Readonly root defaults to dry run

- **WHEN** deployment completes without an explicit readonly apply flag
- **THEN** the deployment runs readonly-root preflight in dry-run mode or prints the readonly-root dry-run command
- **AND** it does not write overlayroot configuration or update initramfs

#### Scenario: Readonly root apply requires verification success

- **WHEN** an operator requests readonly root apply
- **THEN** the deployment first verifies the Solar Display service is active, the health endpoint responds, runtime write paths are writable by the kiosk user, and kiosk launchers are installed
- **AND** it invokes readonly root apply only if all verification checks pass

#### Scenario: Verification failure blocks readonly root apply

- **WHEN** readonly root apply is requested and any verification check fails
- **THEN** the deployment exits non-zero
- **AND** it leaves overlayroot configuration unchanged


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Provide fixed desktop controls for readonly system maintenance

The system SHALL install fixed desktop launchers for enabling readonly system mode and temporarily disabling readonly system mode without exposing arbitrary host command execution.

#### Scenario: Desktop launchers are installed for kiosk user

- **WHEN** kiosk desktop setup completes
- **THEN** the kiosk user's desktop contains an executable launcher named `Enable Read Only System`
- **AND** it contains an executable launcher named `Temporarily Disable Read Only System`
- **AND** both launchers invoke fixed helper scripts installed under the kiosk user's bin directory

#### Scenario: Enable readonly desktop control requires sudo and verification

- **WHEN** an operator launches `Enable Read Only System`
- **THEN** the helper runs readonly-root verification before applying overlayroot
- **AND** it requires sudo for the host-level change
- **AND** it prompts the operator to reboot after a successful apply

#### Scenario: Temporarily disable readonly desktop control requires sudo and reboot

- **WHEN** an operator launches `Temporarily Disable Read Only System`
- **THEN** the helper disables overlayroot through the writable root or `overlayroot-chroot`
- **AND** it requires sudo for the host-level change
- **AND** it prompts the operator to reboot for the change to take effect

<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Resolve the Raspberry Pi connection target at operation time

The deployment documentation SHALL treat the SSH target supplied by the operator for the current operation as the sole connection target and SHALL NOT persist a project Raspberry Pi fixed IP in SSH, deployment, RDP, health-check, or reboot-verification examples.

#### Scenario: Operator prepares an SSH deployment session

- **WHEN** an operator follows the Raspberry Pi deployment documentation
- **THEN** the documentation instructs the operator to set a `<pi-host>` or `<ssh-target>` placeholder from the IP address or MagicDNS name supplied for that operation
- **AND** subsequent SSH, one-key deployment, RDP, health, and reboot-verification commands reuse that selected target

#### Scenario: Target address changes between operations

- **WHEN** the Raspberry Pi receives a different LAN or Tailscale address
- **THEN** the operator changes only the operation-time target value
- **AND** no repository documentation edit is required

#### Scenario: Documentation retains non-target infrastructure addresses

- **WHEN** deployment documentation includes an address for a separate dependency such as the MQTT broker
- **THEN** that address is explicitly identified as dependency configuration rather than the Raspberry Pi SSH target
- **AND** it is not reused as an SSH, RDP, health, or reboot-verification target


<!-- @trace
source: deploy-pi5-four-stage-fan-control
updated: 2026-07-16
code:
  - deploy/verify-kiosk-install.sh
  - deploy/disable-xfce-display-popups.sh
  - deploy.sh
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/configure-lightweight-desktop.sh
  - deploy.md
  - deploy/apply-desktop-theme.sh
  - deploy/disable-display-sleep.sh
  - deploy/configure-pi5-fan-control.sh
  - scripts/deploy.test.mjs
  - deploy/install-kiosk.sh
-->

---
### Requirement: Include Pi 5 thermal configuration in kiosk installation

The kiosk installation flow SHALL invoke the Pi 5 fan configuration helper before final kiosk verification and SHALL package that helper in every deploy bundle that supports Raspberry Pi kiosk installation.

#### Scenario: One-key deployment installs the thermal profile

- **WHEN** the one-key deployment reaches kiosk installation on Raspberry Pi 5
- **THEN** the installer invokes the packaged fan configuration helper
- **AND** helper failure stops installation before final verification is reported as successful

#### Scenario: Deploy bundle is built

- **WHEN** a deploy bundle is assembled
- **THEN** it contains the executable Pi 5 fan configuration helper
- **AND** bundle validation fails if the helper is missing

<!-- @trace
source: deploy-pi5-four-stage-fan-control
updated: 2026-07-16
code:
  - deploy/verify-kiosk-install.sh
  - deploy/disable-xfce-display-popups.sh
  - deploy.sh
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/configure-lightweight-desktop.sh
  - deploy.md
  - deploy/apply-desktop-theme.sh
  - deploy/disable-display-sleep.sh
  - deploy/configure-pi5-fan-control.sh
  - scripts/deploy.test.mjs
  - deploy/install-kiosk.sh
-->

---
### Requirement: Install Tailscale as a standard deployment prerequisite

The Raspberry Pi one-key deployment SHALL install the Tailscale client from Tailscale's official Ubuntu stable package repository and SHALL ensure `tailscaled.service` is enabled and active before replacing application files. The prerequisite SHALL be idempotent and SHALL preserve existing Tailscale node state.

#### Scenario: Fresh supported host does not have Tailscale

- **WHEN** init or update deployment runs on a writable Ubuntu 24.04 arm64 host without the Tailscale CLI
- **THEN** bootstrap configures the official Ubuntu Noble Tailscale keyring and package source
- **AND** it installs the `tailscale` package
- **AND** it enables and starts `tailscaled.service` before application replacement

#### Scenario: Host already has a ready Tailscale installation

- **WHEN** deployment runs with the Tailscale CLI present and `tailscaled.service` enabled and active
- **THEN** the prerequisite succeeds without replacing tailnet enrollment state
- **AND** it does not invoke Tailscale login or change the node's assigned address

#### Scenario: Durable installation is blocked by readonly root

- **WHEN** Tailscale is absent or not durably enabled and the root filesystem is an active overlay
- **THEN** the prerequisite exits nonzero before application replacement
- **AND** it directs the operator to disable readonly root and reboot before retrying

#### Scenario: Package or daemon preparation fails

- **WHEN** the official keyring/source download, apt operation, or daemon enable/start operation fails
- **THEN** bootstrap exits nonzero with the failed prerequisite step
- **AND** it does not replace application files or report deployment success

#### Scenario: Dry run reports the prerequisite

- **WHEN** the operator runs one-key deployment with dry-run enabled
- **THEN** output includes the planned Tailscale install and daemon enable/start stage
- **AND** no package, repository, service, or enrollment state is changed


<!-- @trace
source: add-tailscale-deployment-prerequisite
updated: 2026-07-16
code:
  - deploy/disable-display-sleep.sh
  - scripts/deploy.test.mjs
  - deploy/apply-desktop-theme.sh
  - deploy/raspi-bootstrap.sh
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/verify-kiosk-install.sh
  - deploy.sh
  - deploy.md
  - scripts/raspi-onekey-deploy.sh
  - deploy/disable-xfce-display-popups.sh
  - deploy/install-tailscale.sh
  - deploy/configure-lightweight-desktop.sh
-->

---
### Requirement: Verify local Tailscale readiness separately from tailnet enrollment

The kiosk verification command SHALL require the Tailscale CLI and an enabled and active `tailscaled.service`. Tailnet login, a Tailscale IP, and a particular backend state SHALL NOT be required by local deployment verification.

#### Scenario: Daemon is ready before enrollment

- **WHEN** verification finds the Tailscale CLI and `tailscaled.service` enabled and active while the node has no Tailscale IP
- **THEN** the Tailscale prerequisite check passes
- **AND** documentation directs the operator to complete enrollment explicitly

#### Scenario: Required local Tailscale component is unavailable

- **WHEN** the Tailscale CLI is missing, `tailscaled.service` is disabled, or `tailscaled.service` is inactive
- **THEN** verification reports the Tailscale prerequisite failure
- **AND** verification exits nonzero

#### Scenario: Operator completes enrollment

- **WHEN** the daemon is ready and the operator chooses an interactive login or externally supplied one-time enrollment method
- **THEN** no reusable auth material is read from or written to repository-managed files
- **AND** the operator uses the control-plane-assigned Tailscale IP or MagicDNS name as the operation-time SSH target
- **AND** deployment does not promise or hardcode a particular Tailscale IP

<!-- @trace
source: add-tailscale-deployment-prerequisite
updated: 2026-07-16
code:
  - deploy/disable-display-sleep.sh
  - scripts/deploy.test.mjs
  - deploy/apply-desktop-theme.sh
  - deploy/raspi-bootstrap.sh
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/verify-kiosk-install.sh
  - deploy.sh
  - deploy.md
  - scripts/raspi-onekey-deploy.sh
  - deploy/disable-xfce-display-popups.sh
  - deploy/install-tailscale.sh
  - deploy/configure-lightweight-desktop.sh
-->

---
### Requirement: Select application update or full deployment scope

The deployment entrypoint SHALL expose an explicit `app` or `full` scope and SHALL default update mode to `app` and init mode to `full` when the operator omits the scope.

#### Scenario: Installed application is updated with default scope

- **WHEN** an operator runs update mode without `--scope`
- **THEN** the entrypoint selects app scope
- **AND** forwards app scope to target bootstrap

#### Scenario: Fresh installation selects full scope

- **WHEN** an operator runs init mode without `--scope`
- **THEN** the entrypoint selects full scope

#### Scenario: Host option conflicts with app scope

- **WHEN** app scope is combined with init mode, readonly application, data partition creation, or hotspot policy inputs
- **THEN** the entrypoint exits nonzero before build, upload, or target mutation
- **AND** reports that full scope is required


<!-- @trace
source: split-pi5-full-deploy-and-app-update
updated: 2026-07-16
code:
  - deploy/raspi-bootstrap.sh
  - deploy.md
  - scripts/raspi-onekey-deploy.sh
tests:
  - scripts/deploy.test.mjs
-->

---
### Requirement: Perform a minimal installed-application update

Target bootstrap SHALL provide an app scope that preserves runtime data and updates the existing application without reconfiguring the host.

#### Scenario: App update succeeds

- **WHEN** target bootstrap receives app scope for an existing installed kiosk
- **THEN** it validates the host, existing install root, `/data`, Node, pnpm, and the existing `solar-display.service`
- **AND** creates and verifies a runtime backup before bundle replacement
- **AND** preserves `.env`, SQLite data, logs, and uploads
- **AND** installs production dependencies from the uploaded bundle
- **AND** restarts the existing service
- **AND** verifies the release manifest, active service, and `/health`
- **AND** reports the backup and recovery command

#### Scenario: App update excludes host deployment actions

- **WHEN** target bootstrap runs app scope
- **THEN** it does not install OS packages or Tailscale
- **AND** does not create environment defaults or mutate disk state
- **AND** does not invoke desktop, kiosk, fan, hotspot, readonly, or full kiosk verification helpers
- **AND** does not reboot the target

#### Scenario: Existing application prerequisite is missing

- **WHEN** app scope cannot find the existing install, Node, pnpm, `/data`, or `solar-display.service`
- **THEN** it exits nonzero without silently escalating to full scope
- **AND** retains recovery material when the verified backup was already created

<!-- @trace
source: split-pi5-full-deploy-and-app-update
updated: 2026-07-16
code:
  - deploy/raspi-bootstrap.sh
  - deploy.md
  - scripts/raspi-onekey-deploy.sh
tests:
  - scripts/deploy.test.mjs
-->
