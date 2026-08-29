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

The system SHALL resolve Factory Circuit slot data by the combination of Context Site Scope and a site-independent semantic slot metric key. The Factory Circuit page key SHALL select the page instance/layout and allowed slot set, but CL and KN MAY use the same semantic metric key for the same engineering measurement because the scoped metric identity prevents collisions.

#### Scenario: Same engineering slot exists in multiple sites
- **WHEN** Jungli and Guanyin both bind a `stamping` slot
- **THEN** both slots MAY use the same canonical semantic stamping power metric key
- **AND** the Jungli reading SHALL resolve under `metricScope = cl`
- **AND** the Guanyin reading SHALL resolve under `metricScope = kn`
- **AND** MQTT live values for the two scoped identities SHALL NOT overwrite each other

#### Scenario: Site page identity remains distinct
- **WHEN** playback resolves `factory-circuit` for CL and `factory-circuit-guanyin` for KN
- **THEN** each page keeps its existing page identity, layout, visible-slot rules, and route
- **AND** page identity SHALL NOT be required as part of the semantic metric key

### Requirement: Device-scoped Factory Circuit routing overrides global playback enablement

For an authenticated Display Client Context, Factory Circuit page selection, story data, slot keys, and metric keys SHALL derive from the Context Site Scope. Global playback page enablement SHALL NOT select the Client Site.

#### Scenario: KN Device requests the Factory Circuit Story

- **WHEN** a paired Device in a kn Group requests its Factory Circuit Story
- **THEN** the response contains the KN page identity and KN slot/data bindings
- **AND** no CL-only department or metric is present

<!-- @trace
source: device-context-site-scoped-playback
updated: 2026-07-30
code:
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/deviceIdentity.ts
  - packages/shared/src/displayReadiness.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/routes/playback.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - docs/ops/workflow.md
  - apps/server/src/app.ts
  - docs/ops/maintenance.md
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/index.ts
  - apps/server/src/fastify.ts
  - scripts/fhd-witness-config.mjs
  - packages/shared/src/playback.ts
  - apps/server/src/routes/display-readiness.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/services/playbackProfileService.ts
  - packages/shared/src/displayClientContext.ts
  - .env.example
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - CLAUDE.md
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/devicePairing.ts
  - apps/server/src/services/deviceCredentialService.ts
  - docs/ops/conventions.md
  - deploy/install-thin-kiosk.sh
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/config.ts
  - docs/architecture/default-playback-profile.md
  - scripts/deploy.test.mjs
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/ops/delegation.md
  - apps/server/src/routes/device-groups.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/routes/devices.ts
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/services/displayStoryService.ts
  - AGENTS.md
  - scripts/capture-fhd-witness.mjs
  - .scratch/device-scoped-multisite-playback/spec.md
tests:
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->
