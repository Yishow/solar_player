# factory-circuit-multi-site-split Specification

## Purpose

TBD - created by archiving change 'factory-circuit-sites-split'. Update Purpose after archive.

## Requirements

### Requirement: Page Registry Multi-site Routing
The system SHALL register two separate playback pages using the `factory-circuit` template in the page registry:
- "factory-circuit" with route "/factory-circuit", display label "中壢廠區用電迴路" in Traditional Chinese.
- "factory-circuit-guanyin" with route "/factory-circuit-guanyin", display label "觀音廠區用電迴路" in Traditional Chinese.

#### Scenario: Navigating to individual site routes
- **WHEN** the browser requests `/factory-circuit`
- **THEN** the system SHALL render the Factory Circuit page representing the Jungli site
- **WHEN** the browser requests `/factory-circuit-guanyin`
- **THEN** the system SHALL render the Factory Circuit page representing the Guanyin site

---
### Requirement: Slot Keys Expansion and Rename
The system MUST support exactly 8 circuit slots representing the actual factory departments:
- `stamping`: Stamping Shop (沖壓工程)
- `body`: Body Shop (車身工程)
- `painting`: Painting Shop (塗裝工程)
- `assembly`: Assembly Shop (裝配工程)
- `utility`: Utility & Powerhouse (原動力)
- `office`: Office & Administration (事務系)
- `heavy_vehicle`: Heavy Vehicle Line (大車工程)
- `ed_coating`: ED Coating Line (ED電著)

#### Scenario: Associating circuits with new slots
- **WHEN** the administrator assigns a circuit to a slot in the circuit settings
- **THEN** the options MUST include `stamping`, `body`, `painting`, `assembly`, `utility`, `office`, `heavy_vehicle`, and `ed_coating`

---
### Requirement: Site-Specific Load Visibility and Geometry Configuration
The system MUST support site-specific configurations and data scope for load rows:
- The Jungli site (page key `factory-circuit`) SHALL have `stamping`, `body`, `painting`, `assembly`, `utility`, and `office` slots visible and data-scoped, while `heavy_vehicle` and `ed_coating` are hidden and SHALL NOT be required for Jungli aggregate power.
- The Guanyin site (page key `factory-circuit-guanyin`) SHALL have all 8 slots visible and data-scoped.
- The 8-row layout for Guanyin site MUST use a compact arrangement with row height 65px and vertical step 74px to fit inside the FHD canvas without overlapping lower KPI cards.

#### Scenario: Rendering and aggregating the load panel for Jungli site
- **WHEN** the Jungli site page configuration and story are resolved
- **THEN** only the 6 standard rows SHALL be displayed on the load panel
- **AND** the vertical spacing SHALL use the standard layout (height: 84px, step: 95px)
- **AND** the current factory total power SHALL sum only the 6 Jungli-scoped slots

##### Example: Jungli aggregate ignores Guanyin-only slots
- **GIVEN** Jungli scoped slot values are `10`, `20`, `30`, `40`, `50`, and `60` kW
- **AND** Guanyin scoped `heavy_vehicle` and `ed_coating` values are `700` and `800` kW
- **WHEN** the Jungli Factory Circuit story is resolved
- **THEN** current factory total power SHALL be `210` kW

#### Scenario: Rendering and aggregating the load panel for Guanyin site
- **WHEN** the Guanyin site page configuration and story are resolved
- **THEN** all 8 rows SHALL be displayed on the load panel
- **AND** the vertical spacing SHALL use the compact layout (height: 65px, step: 74px)
- **AND** the current factory total power SHALL sum all 8 Guanyin-scoped slots

##### Example: Guanyin aggregate includes all Guanyin slots
- **GIVEN** Guanyin scoped slot values are `1`, `2`, `3`, `4`, `5`, `6`, `7`, and `8` kW
- **WHEN** the Guanyin Factory Circuit story is resolved
- **THEN** current factory total power SHALL be `36` kW


<!-- @trace
source: scope-factory-circuit-data-by-page-key
updated: 2026-07-08
code:
  - packages/shared/src/index.ts
  - apps/server/src/db/migrations/019_circuit_page_scope.sql
  - apps/server/src/db/migrations/020_fix_factory_circuit_site_counts.sql
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/db/seed.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/circuits.ts
  - apps/server/src/routes/display-story.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/services/displayReadinessService.ts
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/displayCardDataService.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/MqttSettings/index.tsx
tests:
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/routes/circuits.test.ts
  - apps/server/src/services/displayStoryService.test.ts
-->

---
### Requirement: Dynamic SVG Routing Line Calculation
The SVG power routing path and circles in `/factory-circuit` pages MUST be calculated dynamically based on the vertical position (top) and height of currently visible load rows.

#### Scenario: Auto-generating SVG routing paths
- **WHEN** the page resolves the layout of active load rows
- **THEN** the system SHALL construct the SVG `<path>` and target `<circle>` markers to align perfectly with the left centers of the rendered load rows
- **AND** the system MUST NOT use hardcoded static path coordinates for load row endpoints

---
### Requirement: Factory Circuit story resolves by page key
The system SHALL resolve Factory Circuit story payloads by Factory Circuit page key.

#### Scenario: Jungli and Guanyin story routes use different circuit scopes
- **WHEN** the browser or playback runtime requests `/api/display-story/factory-circuit`
- **THEN** the returned Factory Circuit story SHALL use only circuits scoped to `factory-circuit`
- **WHEN** the browser or playback runtime requests `/api/display-story/factory-circuit-guanyin`
- **THEN** the returned Factory Circuit story SHALL use only circuits scoped to `factory-circuit-guanyin`


<!-- @trace
source: scope-factory-circuit-data-by-page-key
updated: 2026-07-08
code:
  - packages/shared/src/index.ts
  - apps/server/src/db/migrations/019_circuit_page_scope.sql
  - apps/server/src/db/migrations/020_fix_factory_circuit_site_counts.sql
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/db/seed.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/circuits.ts
  - apps/server/src/routes/display-story.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/services/displayReadinessService.ts
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/displayCardDataService.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/MqttSettings/index.tsx
tests:
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/routes/circuits.test.ts
  - apps/server/src/services/displayStoryService.test.ts
-->

---
### Requirement: Factory Circuit metric keys are page-scoped
The system SHALL resolve Factory Circuit slot metric keys by Factory Circuit page key and slot key.

#### Scenario: Same engineering slot exists in multiple sites
- **WHEN** Jungli and Guanyin both bind a `stamping` slot
- **THEN** the Jungli slot SHALL use a Jungli metric key
- **AND** the Guanyin slot SHALL use a distinct Guanyin metric key
- **AND** MQTT live values for the two slots SHALL NOT overwrite each other

<!-- @trace
source: scope-factory-circuit-data-by-page-key
updated: 2026-07-08
code:
  - packages/shared/src/index.ts
  - apps/server/src/db/migrations/019_circuit_page_scope.sql
  - apps/server/src/db/migrations/020_fix_factory_circuit_site_counts.sql
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/db/seed.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/circuits.ts
  - apps/server/src/routes/display-story.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/services/displayReadinessService.ts
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/displayCardDataService.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/MqttSettings/index.tsx
tests:
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/routes/circuits.test.ts
  - apps/server/src/services/displayStoryService.test.ts
-->
