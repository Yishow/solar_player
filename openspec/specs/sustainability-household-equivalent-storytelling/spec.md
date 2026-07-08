# sustainability-household-equivalent-storytelling Specification

## Purpose

TBD - created by archiving change 'add-sustainability-household-equivalent-cards'. Update Purpose after archive.

## Requirements

### Requirement: Derive household-equivalent cards from measured self-consumption

The system SHALL derive Sustainability household-equivalent cards from measured self-consumption data and a declared calculation profile instead of hand-authored household counts.

#### Scenario: Daily household-equivalent card resolves from daily self-consumption

- **WHEN** the Sustainability runtime reads a daily summary that includes the current day's self-consumption total
- **THEN** the `today` household-equivalent card derives its household count from that measured self-consumption and the selected calculation profile
- **AND** the card does not substitute total generation when self-consumption is unavailable

##### Example: Daily summary yields a household-equivalent headline

- **GIVEN** the current day's self-consumption total is available in the daily summary
- **AND** the selected calculation profile defines a four-person household daily bill basis
- **WHEN** the Sustainability runtime resolves the `today` household-equivalent card
- **THEN** the card outputs a headline in the form `X households of four`
- **AND** the derived result is tagged with the profile that produced it

#### Scenario: Cumulative household-equivalent card resolves from cumulative self-consumption

- **WHEN** the Sustainability runtime reads cumulative self-consumption counters
- **THEN** the `cumulative` household-equivalent card derives its household count from the measured cumulative self-consumption and the selected calculation profile's monthly household bill basis
- **AND** the card keeps cumulative equivalence separate from the current-day card


<!-- @trace
source: add-sustainability-household-equivalent-cards
updated: 2026-05-22
code:
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - scripts/dev.test.mjs
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - scripts/dev-lib.mjs
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - packages/shared/src/cloneValue.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->

---
### Requirement: Keep household-equivalent assumptions visible to the operator-facing page

The system SHALL keep household-equivalent assumptions, profile identity, and disclaimer text available to the operator-facing Sustainability page even when the headline hides the underlying currency calculation.

#### Scenario: Sustainability renders the card disclaimer

- **WHEN** a household-equivalent card is rendered on Sustainability
- **THEN** the page can show the card's disclaimer and profile-backed assumption text alongside the derived household headline
- **AND** the visible headline remains centered on household count rather than raw currency

##### Example: Headline shows households while the disclaimer names the estimate basis

- **GIVEN** a derived card uses the default four-person household profile
- **WHEN** the page renders the card
- **THEN** the main headline reads `18 households of four`
- **AND** the supporting copy can state that the estimate is based on average four-person household usage and an estimated tariff


<!-- @trace
source: add-sustainability-household-equivalent-cards
updated: 2026-05-22
code:
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - scripts/dev.test.mjs
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - scripts/dev-lib.mjs
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - packages/shared/src/cloneValue.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->

---
### Requirement: Surface unavailable state when the equivalence basis is missing

The system SHALL surface an unavailable state for household-equivalent cards when the required self-consumption basis or calculation profile is missing.

#### Scenario: Daily summary is unavailable

- **WHEN** the Sustainability runtime cannot read the current day's self-consumption basis for the daily household-equivalent card
- **THEN** the card resolves to an unavailable state
- **AND** the card explains that the estimate basis is unavailable instead of silently falling back to total generation

##### Example: Missing daily self-consumption blocks the today card

- **GIVEN** the daily summary has no valid `self_consumption_total` for the current date
- **AND** the cumulative self-consumption counter is still present
- **WHEN** the Sustainability runtime resolves the `today` household-equivalent card
- **THEN** the `today` card renders an unavailable state
- **AND** the runtime does not borrow the cumulative counter or total generation to fabricate a daily household count

<!-- @trace
source: add-sustainability-household-equivalent-cards
updated: 2026-05-22
code:
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - scripts/dev.test.mjs
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - scripts/dev-lib.mjs
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - packages/shared/src/cloneValue.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->

---
### Requirement: Expose household-equivalent derivation to card data management

The system SHALL expose Sustainability household-equivalent derivation details to card data management.

#### Scenario: Operator reviews household-equivalent card diagnostics

- **WHEN** the operator reviews a household-equivalent card in `Card Data Management`
- **THEN** diagnostics SHALL show the self-consumption basis, calculation profile fields, computed household count, source availability, and last aggregate update
- **AND** diagnostics SHALL distinguish daily summary inputs from cumulative counter inputs

##### Example: Daily household-equivalent card names its calculation basis

- **GIVEN** the daily household-equivalent card uses daily self-consumption and `householdDailyUsageKwh`
- **WHEN** diagnostics are generated for the daily household-equivalent card
- **THEN** the row names `selfConsumption` daily summary data as the source basis
- **AND** the row names `householdDailyUsageKwh` as the calculation profile field

#### Scenario: Household-equivalent aggregate input is unavailable

- **WHEN** a household-equivalent card cannot compute because the required self-consumption aggregate is unavailable
- **THEN** diagnostics SHALL classify the row as `waiting-aggregate`
- **AND** diagnostics SHALL identify the upstream MQTT metric that feeds the aggregate when that upstream mapping exists


<!-- @trace
source: add-topic-workspace-card-data-management
updated: 2026-07-08
code:
  - deploy/configure-lightweight-desktop.sh
  - .env.example
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - deploy/tailscale-hotspot-trigger.timer
  - scripts/deploy.test.mjs
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - deploy/tailscale-hotspot-trigger.sh
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - deploy.sh
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/server/src/app.ts
  - deploy/disable-xfce-display-popups.sh
  - apps/server/src/services/displayCardDataService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - packages/shared/src/index.ts
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
-->

---
### Requirement: Apply display overrides without changing household-equivalent formulas

The system SHALL apply display overrides to Sustainability household-equivalent card display values without changing household-equivalent formulas or source aggregates.

#### Scenario: Operator overrides a household-equivalent card

- **WHEN** the operator applies a display override to a household-equivalent card
- **THEN** playback SHALL display the override value for that card target
- **AND** diagnostics SHALL keep the computed household value, self-consumption basis, and calculation profile visible as source provenance
- **AND** the system SHALL NOT change the household-equivalent calculation profile or self-consumption aggregate because of the override

##### Example: Daily household override preserves computed value

- **GIVEN** the computed daily household count is `4`
- **WHEN** the operator applies display override value `8`
- **THEN** playback displays `8` for the daily household card
- **AND** diagnostics keep computed household count `4` as source provenance

#### Scenario: Operator clears a household-equivalent override

- **WHEN** the operator clears the household-equivalent override
- **THEN** playback SHALL return to the formula-derived household count
- **AND** diagnostics SHALL no longer mark the card target as overridden

##### Example: Cleared household override returns to formula result

- **GIVEN** the computed cumulative household count is `18`
- **AND** an active override displays `25`
- **WHEN** the operator clears the override
- **THEN** playback displays `18` for the cumulative household card

<!-- @trace
source: add-topic-workspace-card-data-management
updated: 2026-07-08
code:
  - deploy/configure-lightweight-desktop.sh
  - .env.example
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - deploy/tailscale-hotspot-trigger.timer
  - scripts/deploy.test.mjs
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - deploy/tailscale-hotspot-trigger.sh
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - deploy.sh
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/server/src/app.ts
  - deploy/disable-xfce-display-popups.sh
  - apps/server/src/services/displayCardDataService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - packages/shared/src/index.ts
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
-->