# data-hub-task-workspace Specification

## Purpose

TBD - created by archiving change 'refactor-data-hub-task-workspace'. Update Purpose after archive.

## Requirements

### Requirement: Task entry points coexist with direct specialist routes
<!-- requirement-id: U1-R1 -->

Data Hub SHALL provide connect-new-data, edit-existing-data and diagnose-data tasks while retaining directly addressable connection, source, metric and external-data routes. Existing legacy redirects SHALL preserve supported scope and metric filters.

#### Scenario: Task landing
<!-- scenario-id: U1-R1-S01 -->

- **GIVEN** an authorized operator opens the Data Hub root
- **WHEN** the page loads
- **THEN** the three tasks and scoped health summary are visible without requiring terminology knowledge
- **AND** the task home overview fits within the management viewport without requiring vertical scrolling

#### Scenario: Legacy diagnostics bookmark
<!-- scenario-id: U1-R1-S02 -->

- **GIVEN** a bookmark includes an old diagnostics path with scope=kn and a metric key
- **WHEN** the router redirects
- **THEN** the consolidated metrics view preserves KN and the requested metric

---
### Requirement: Management scope is consistent but distinct from other contexts
<!-- requirement-id: U1-R2 -->

Management scope SHALL drive list filtering, counts and creation defaults only. KN creation SHALL default to KN; all SHALL require a concrete choice. It SHALL NOT change a display binding or preview device context. Invalid URL scopes SHALL receive a safe explicit correction.

#### Scenario: Create under KN
<!-- scenario-id: U1-R2-S01 -->

- **GIVEN** the source list scope is kn
- **WHEN** the operator opens new source
- **THEN** KN is selected and CL is not silently assigned

#### Scenario: Create under all
<!-- scenario-id: U1-R2-S02 -->

- **GIVEN** the scope is all
- **WHEN** the operator creates a physical meter
- **THEN** a CL or KN choice is required before saving

---
### Requirement: Shared infrastructure is clearly labeled
<!-- requirement-id: U1-R3 -->

Broker and currently shared external-data configuration SHALL be labeled as shared infrastructure. A management site filter SHALL NOT imply that saving these settings affects only that site.

#### Scenario: Shared broker under KN filter
<!-- scenario-id: U1-R3-S01 -->

- **GIVEN** KN is selected in Data Hub
- **WHEN** Connections opens
- **THEN** one shared broker and its system-wide impact are shown

#### Scenario: Weather scope not applicable
<!-- scenario-id: U1-R3-S02 -->

- **GIVEN** existing weather settings are global/shared
- **WHEN** a site filter is visible
- **THEN** its non-applicability is stated and no duplicate site weather configuration is fabricated

---
### Requirement: Source and metric lists prioritize operator questions
<!-- requirement-id: U1-R4 -->

The primary list SHALL show human-readable name, site, latest value/unit, freshness, ownership and usage state, with search and issue filters. Advanced transport fields SHALL be disclosed on demand rather than expanded on every row.

#### Scenario: Find a problematic source
<!-- scenario-id: U1-R4-S01 -->

- **GIVEN** many sources exist
- **WHEN** the operator filters KN and unhealthy then searches a name
- **THEN** only matching KN sources appear with an actionable health explanation

#### Scenario: Managed adapter
<!-- scenario-id: U1-R4-S02 -->

- **GIVEN** a system-owned source is selected
- **WHEN** details open
- **THEN** ownership and the reason for read-only fields are clear

---
### Requirement: Filtering and refresh cannot discard other scopes or drafts
<!-- requirement-id: U1-R5 -->

Saving a filtered source view SHALL preserve sources outside that filter. Live observation refresh SHALL not overwrite editable drafts. Navigation with unsaved edits SHALL preserve the draft or require an explicit discard decision. Configuration baselines, editable drafts and observations SHALL be separate. A single-source save SHALL not save another source's draft, and conflicting server changes SHALL not be overwritten silently. All destructive navigation paths SHALL use one coherent dirty-decision mechanism.

#### Scenario: Save one KN source
<!-- scenario-id: U1-R5-S01 -->

- **GIVEN** CL and KN mappings coexist and the view is filtered to KN
- **WHEN** a KN edit is saved
- **THEN** CL mappings remain byte-equivalent in editable configuration

#### Scenario: Live refresh while editing
<!-- scenario-id: U1-R5-S02 -->

- **GIVEN** a source name has unsaved edits
- **WHEN** a new live value arrives
- **THEN** the new observation appears without replacing the edited name

#### Scenario: Concurrent server update
<!-- scenario-id: U1-R5-S03 -->

- **GIVEN** another operator has saved a newer revision of this source
- **WHEN** an old draft is saved
- **THEN** the operation reports a conflict with no overwrite and retains the local draft

#### Scenario: One navigation decision
<!-- scenario-id: U1-R5-S04 -->

- **GIVEN** the editor and workspace both know the draft is dirty
- **WHEN** the operator leaves through Back or scope navigation
- **THEN** one consistent confirmation is shown rather than duplicate prompts

#### Scenario: Normalized save response
<!-- scenario-id: U1-R5-S05 -->

- **GIVEN** the server accepts and normalizes a source name
- **WHEN** the save response is adopted
- **THEN** the saved normalized configuration becomes the clean baseline without preserving a false dirty copy


<!-- @trace
source: harden-data-hub-source-edit-transactions
updated: 2026-09-16
code:
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/sourceEditReceiptService.ts
  - apps/server/src/services/sourceEditTransactionService.ts
  - apps/server/src/services/sourceEditValidationService.ts
  - apps/server/src/db/migrations/053_data_hub_source_edit_transactions.sql
  - apps/server/src/app.ts
  - apps/server/src/services/sourceEditCollectionService.ts
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - packages/shared/src/dataHubSourceTransactions.ts
  - apps/server/src/routes/data-hub-source-mappings.ts
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
tests:
  - apps/server/src/routes/data-hub-source-edit-transactions.test.ts
  - apps/web/src/pages/DataHub/SourcesModelTransactions.test.ts
-->

---
### Requirement: The workspace remains usable with keyboard and smaller desktops
<!-- requirement-id: U1-R6 -->

Task navigation, lists, drawers and critical actions SHALL be keyboard operable, have visible focus and textual status, and remain usable at 1366x768, 1440x900 and 1920x1080. No status SHALL depend on color alone. Opening, typing, input composition, saving and live updates SHALL preserve logical focus. Required dialog actions SHALL be inside the dialog. Background interaction and scrolling SHALL be isolated while modal, and restored when it closes. Non-excepted content SHALL remain usable at a 320 CSS pixel width.

#### Scenario: Keyboard drawer use
<!-- scenario-id: U1-R6-S01 -->

- **GIVEN** the operator uses Tab and Enter only
- **WHEN** a source is opened, edited and closed
- **THEN** focus order is logical and returns to the initiating row

#### Scenario: Smaller desktop
<!-- scenario-id: U1-R6-S02 -->

- **GIVEN** the viewport is 1366x768
- **WHEN** an error and save action are displayed
- **THEN** neither required input nor save/discard action is clipped or unreachable

#### Scenario: Typing and live updates preserve focus
<!-- scenario-id: U1-R6-S03 -->

- **GIVEN** the caret is within a source name and an IME composition may be active
- **WHEN** the parent rerenders and new observations arrive
- **THEN** the same input, caret and composition remain active without reopening or resetting focus

#### Scenario: Hidden fields are not tab stops
<!-- scenario-id: U1-R6-S04 -->

- **GIVEN** an advanced section is collapsed
- **WHEN** Tab or Shift+Tab traverses the modal
- **THEN** only visible enabled controls participate and focus does not enter background content

#### Scenario: Closed row no longer exists
<!-- scenario-id: U1-R6-S05 -->

- **GIVEN** the initiating source is deleted or filtered out
- **WHEN** the inspector closes
- **THEN** focus returns once to a documented logical list fallback rather than document body


<!-- @trace
source: refine-data-hub-source-inspector
updated: 2026-09-16
code:
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.ts
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - packages/shared/src/mqttObservation.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx
  - packages/shared/src/engineeringSources.ts
  - apps/web/src/pages/DataHub/ReceivedSampleDrawer.tsx
  - apps/server/src/services/mqttObservationCatalogService.ts
  - packages/shared/src/engineeringGate.ts
  - apps/web/src/pages/DataHub/ReceivedDataWorkspace.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx
  - apps/server/src/services/engineeringReportService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.tsx
  - apps/server/src/services/sourceEditCollectionService.ts
  - apps/server/src/db/migrations/053_data_hub_source_edit_transactions.sql
  - packages/shared/src/siteEnergyProfile.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DataHub/SourceInspectorUsagePanel.tsx
  - apps/web/src/pages/DataHub/ReceivedCandidateList.tsx
  - apps/server/src/routes/engineering-sources.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/sourceEditTransactionService.ts
  - packages/shared/src/powerMqttPublishingContract.ts
  - apps/server/src/services/sourceEditValidationService.ts
  - apps/server/src/services/sourceEditReceiptService.ts
  - apps/web/src/pages/DataHub/ReceptionScopePicker.tsx
  - apps/server/src/services/engineeringSourceService.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/server/src/app.ts
  - packages/shared/src/engineeringPeriodResults.ts
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
  - apps/server/src/routes/data-hub-source-mappings.ts
  - apps/server/src/db/migrations/054_engineering_sources_and_reports.sql
  - apps/web/src/pages/DataHub/useSourceEditorController.ts
  - apps/web/src/pages/DataHub/SourceInspectorOverview.tsx
  - apps/web/src/pages/DataHub/ConfiguredSourcesView.tsx
  - apps/web/src/pages/DataHub/CaptureStatusBar.tsx
  - apps/web/src/pages/DataHub/SourceInspectorMappingForm.tsx
  - packages/shared/src/dataHubSourceTransactions.ts
  - apps/web/src/pages/DataHub/workspaceContext.ts
tests:
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.test.tsx
  - apps/server/src/routes/data-hub-source-edit-transactions.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionDiagnostics.test.tsx
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.test.tsx
  - packages/shared/src/engineeringGate.test.ts
  - packages/shared/src/engineeringPeriodResults.test.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.test.ts
  - apps/server/src/services/engineeringServices.test.ts
  - packages/shared/src/powerMqttPublishingContract.test.ts
  - apps/web/src/pages/DataHub/SourceInspector.test.tsx
  - apps/web/src/pages/DataHub/ReceptionWorkspace.test.tsx
  - apps/server/src/routes/engineering-sources.test.ts
  - packages/shared/src/siteEnergyProfileV2.test.ts
  - packages/shared/src/mqttObservation.test.ts
  - apps/server/src/services/engineeringRolloutMigration.test.ts
  - apps/web/src/pages/DataHub/workspaceContext.test.ts
  - apps/server/src/routes/mqtt-captures.test.ts
  - packages/shared/src/engineeringDisplayBinding.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.test.tsx
  - packages/shared/src/engineeringSources.test.ts
  - apps/web/src/pages/DataHub/SourcesModelTransactions.test.ts
-->

---
### Requirement: Energy setup is a discoverable site task
<!-- requirement-id: U1-R7 -->

DataHub SHALL provide the 廠區用電設定 task with CL/KN completion and data-readiness summaries. It SHALL link to one U6 surface instead of creating independent total/numerator/denominator forms. An all-sites context SHALL prompt explicit site selection and playback visibility SHALL not hide site accounting settings.

#### Scenario: New site
<!-- scenario-id: U1-R7-S01 -->

- **GIVEN** KN sources exist but accounting has not been configured
- **WHEN** the DataHub task home opens
- **THEN** a named 設定觀音用電 action is available without reading source/mapping/metric documentation

#### Scenario: All-sites entry
<!-- scenario-id: U1-R7-S02 -->

- **GIVEN** all-sites is selected
- **WHEN** the energy task starts
- **THEN** the operator explicitly chooses a site, not a silently defaulted CL profile

---
### Requirement: DataHub starts source tasks from received-data inventory
<!-- requirement-id: U1-R8 -->

The DataHub source workspace SHALL expose the M1 observed-data catalog and M2 add-from-received-data action before requiring a technical mapping form. Existing topic subscriptions SHALL not be presented as an inventory of all available meters. The task SHALL preserve concrete site and return context; missing permissions or scope setup SHALL be resolved inline where authorized. Configured sources and observed data SHALL be separately named, directly reachable workspace views. The normal create action SHALL start from received evidence, with manual technical configuration as an explicit advanced alternative.

#### Scenario: KN task entry
<!-- scenario-id: U1-R8-S01 -->

- **GIVEN** the active workspace is KN
- **WHEN** the user selects add meter from received data
- **THEN** M1/M2 opens with KN and the current approved connection without asking to copy topic strings

#### Scenario: No mappings yet
<!-- scenario-id: U1-R8-S02 -->

- **GIVEN** approved discovery observations exist but zero generic mappings exist
- **WHEN** the user opens sources
- **THEN** unmapped candidates are visible and selectable instead of an empty form demanding a metric key

#### Scenario: Existing source is silent
<!-- scenario-id: U1-R8-S03 -->

- **GIVEN** a configured source has no observations in the current capture window
- **WHEN** the user reviews the workspace
- **THEN** it remains configured and is shown as not observed in that window, not deleted or absent equipment


<!-- @trace
source: redesign-data-hub-reception-workspace
updated: 2026-09-16
code:
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.ts
  - packages/shared/src/mqttObservation.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/services/engineeringSourceService.ts
  - apps/server/src/services/engineeringReportService.ts
  - apps/server/src/services/sourceEditCollectionService.ts
  - apps/web/src/pages/DataHub/ReceivedDataWorkspace.tsx
  - apps/server/src/routes/engineering-sources.ts
  - packages/shared/src/siteEnergyProfile.ts
  - packages/shared/src/engineeringSources.ts
  - apps/server/src/routes/data-hub-source-mappings.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx
  - apps/server/src/db/migrations/053_data_hub_source_edit_transactions.sql
  - apps/web/src/pages/DataHub/ReceptionScopePicker.tsx
  - apps/server/src/db/migrations/054_engineering_sources_and_reports.sql
  - apps/web/src/pages/DataHub/ReceivedCandidateList.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/sourceEditValidationService.ts
  - apps/web/src/pages/DataHub/ReceivedSampleDrawer.tsx
  - apps/web/src/pages/DataHub/ConfiguredSourcesView.tsx
  - packages/shared/src/index.ts
  - apps/server/src/services/mqttObservationCatalogService.ts
  - packages/shared/src/engineeringGate.ts
  - packages/shared/src/powerMqttPublishingContract.ts
  - apps/server/src/services/sourceEditTransactionService.ts
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - apps/web/src/pages/DataHub/workspaceContext.ts
  - packages/shared/src/dataHubSourceTransactions.ts
  - packages/shared/src/engineeringPeriodResults.ts
  - apps/web/src/pages/DataHub/CaptureStatusBar.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - apps/server/src/services/sourceEditReceiptService.ts
tests:
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.test.tsx
  - packages/shared/src/engineeringSources.test.ts
  - packages/shared/src/powerMqttPublishingContract.test.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.test.tsx
  - packages/shared/src/engineeringGate.test.ts
  - packages/shared/src/siteEnergyProfileV2.test.ts
  - packages/shared/src/engineeringPeriodResults.test.ts
  - apps/web/src/pages/DataHub/SourcesModelTransactions.test.ts
  - apps/server/src/services/engineeringRolloutMigration.test.ts
  - apps/server/src/services/engineeringServices.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionDiagnostics.test.tsx
  - apps/web/src/pages/DataHub/workspaceContext.test.ts
  - apps/server/src/routes/data-hub-source-edit-transactions.test.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.test.ts
  - packages/shared/src/mqttObservation.test.ts
  - packages/shared/src/engineeringDisplayBinding.test.ts
  - apps/web/src/pages/DataHub/ReceptionWorkspace.test.tsx
  - apps/server/src/routes/engineering-sources.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.test.tsx
  - apps/server/src/routes/mqtt-captures.test.ts
-->

---
### Requirement: Data Hub provides direct access to calculation settings and operational maintenance
<!-- requirement-id: U1-R9 -->

Data Hub SHALL provide an accessible operational entry point for global calculation settings (carbon emission factor, tree equivalent factor, household usage baselines, and estimated electricity tariff) and runtime trend reset maintenance. Navigating to operations SHALL NOT be blocked by circular redirects, and calculation settings SHALL be clearly marked as global shared parameters.

#### Scenario: Operator opens calculation settings and operations from Metrics
<!-- scenario-id: U1-R9-S01 -->

- **GIVEN** an authorized operator is viewing the Data Hub Metrics section
- **WHEN** the operator opens the operations maintenance view
- **THEN** the calculation settings form is displayed with currently persisted values and global scope indication
- **AND** today and month trend reset controls are available

#### Scenario: Legacy operations URL loads operational maintenance
<!-- scenario-id: U1-R9-S02 -->

- **GIVEN** an operator accesses /settings/data-hub/diagnostics/operations
- **WHEN** the route resolves
- **THEN** the operational maintenance component is rendered directly without redirecting back to sources

<!-- @trace
source: integrate-data-source-operations-into-data-hub
updated: 2026-09-08
code:
  - apps/web/src/pages/DataHub/Metrics.tsx
  - apps/web/src/pages/DataHub/TaskHome.tsx
  - apps/web/src/app/dataHubCompatibility.ts
  - apps/web/src/app/router.tsx
tests:
  - apps/web/src/pages/DataHub/Metrics.test.tsx
  - apps/web/src/app/router.test.ts
  - apps/web/src/pages/DataHub/TaskHome.test.tsx
  - apps/web/src/app/dataHubCompatibility.test.ts
-->

---
### Requirement: Workspace navigation preserves scope and stable selection
<!-- requirement-id: DHR-R1 -->

The workspace SHALL keep supported scope, search, filter, view and selection state addressable without storing secrets or raw samples in URLs. Back, Forward, refresh and inspector close SHALL have consistent outcomes. Live updates SHALL not reorder the active selection or replace its evidence without an explicit review action.

#### Scenario: Return to a filtered list
<!-- scenario-id: DHR-R1-S01 -->

- **GIVEN** a KN issue-filtered search opened one source
- **WHEN** the operator closes the inspector or presses Back
- **THEN** the same scoped search and logical scroll position return

#### Scenario: Late response from old site
<!-- scenario-id: DHR-R1-S02 -->

- **GIVEN** a CL request is pending and the operator switches to KN
- **WHEN** the CL response arrives
- **THEN** no CL payload, candidate, count or draft appears in the KN view

#### Scenario: Direct link closes safely
<!-- scenario-id: DHR-R1-S03 -->

- **GIVEN** the user entered a direct source bookmark without a list history entry
- **WHEN** the inspector is closed
- **THEN** selection is cleared in place rather than navigating away to an unrelated previous website

#### Scenario: New observation while selecting
<!-- scenario-id: DHR-R1-S04 -->

- **GIVEN** a candidate and sample revision are selected
- **WHEN** new traffic or a new schema arrives
- **THEN** the selected identity stays stable and any evidence change requires deliberate review


<!-- @trace
source: redesign-data-hub-reception-workspace
updated: 2026-09-16
code:
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.ts
  - packages/shared/src/mqttObservation.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/services/engineeringSourceService.ts
  - apps/server/src/services/engineeringReportService.ts
  - apps/server/src/services/sourceEditCollectionService.ts
  - apps/web/src/pages/DataHub/ReceivedDataWorkspace.tsx
  - apps/server/src/routes/engineering-sources.ts
  - packages/shared/src/siteEnergyProfile.ts
  - packages/shared/src/engineeringSources.ts
  - apps/server/src/routes/data-hub-source-mappings.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx
  - apps/server/src/db/migrations/053_data_hub_source_edit_transactions.sql
  - apps/web/src/pages/DataHub/ReceptionScopePicker.tsx
  - apps/server/src/db/migrations/054_engineering_sources_and_reports.sql
  - apps/web/src/pages/DataHub/ReceivedCandidateList.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/sourceEditValidationService.ts
  - apps/web/src/pages/DataHub/ReceivedSampleDrawer.tsx
  - apps/web/src/pages/DataHub/ConfiguredSourcesView.tsx
  - packages/shared/src/index.ts
  - apps/server/src/services/mqttObservationCatalogService.ts
  - packages/shared/src/engineeringGate.ts
  - packages/shared/src/powerMqttPublishingContract.ts
  - apps/server/src/services/sourceEditTransactionService.ts
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - apps/web/src/pages/DataHub/workspaceContext.ts
  - packages/shared/src/dataHubSourceTransactions.ts
  - packages/shared/src/engineeringPeriodResults.ts
  - apps/web/src/pages/DataHub/CaptureStatusBar.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - apps/server/src/services/sourceEditReceiptService.ts
tests:
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.test.tsx
  - packages/shared/src/engineeringSources.test.ts
  - packages/shared/src/powerMqttPublishingContract.test.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.test.tsx
  - packages/shared/src/engineeringGate.test.ts
  - packages/shared/src/siteEnergyProfileV2.test.ts
  - packages/shared/src/engineeringPeriodResults.test.ts
  - apps/web/src/pages/DataHub/SourcesModelTransactions.test.ts
  - apps/server/src/services/engineeringRolloutMigration.test.ts
  - apps/server/src/services/engineeringServices.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionDiagnostics.test.tsx
  - apps/web/src/pages/DataHub/workspaceContext.test.ts
  - apps/server/src/routes/data-hub-source-edit-transactions.test.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.test.ts
  - packages/shared/src/mqttObservation.test.ts
  - packages/shared/src/engineeringDisplayBinding.test.ts
  - apps/web/src/pages/DataHub/ReceptionWorkspace.test.tsx
  - apps/server/src/routes/engineering-sources.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.test.tsx
  - apps/server/src/routes/mqtt-captures.test.ts
-->

---
### Requirement: Source families preserve managed reuse and explicit power onboarding
<!-- requirement-id: DHR-R5 -->

The workspace SHALL classify configured and observed sources using registered contracts and reviewed site metadata, not solely topic spelling. Standard Solar summary and whole-zone canonical sources SHALL be reused through SolarSourceAdapter. Physical raw channels MAY enter reviewed M2 onboarding. Authoritative engineering results SHALL use the G engineering workflow without requiring raw-meter publication. Unreviewed virtual sums and control/health messages SHALL remain non-meter evidence, while approved engineering results MAY contribute through the typed engineering provider. Nonstandard Solar topics MAY retain explicitly reviewed generic use under non-owned metric identities; a blanket ban on all solar-prefixed topics SHALL NOT replace ownership checks.

#### Scenario: Solar data already ingested
<!-- scenario-id: DHR-R5-S01 -->

- **GIVEN** the standard solar/KN/summary is observed and owned by the adapter
- **WHEN** the user selects it in received data
- **THEN** the action opens or reuses the managed source without creating a competing generic canonical writer

#### Scenario: Raw and calculated duplicates
<!-- scenario-id: DHR-R5-S02 -->

- **GIVEN** one physical counter appears as raw and within a publisher virtual total
- **WHEN** the workspace counts or selects meters
- **THEN** physical-meter counts and engineering-result counts remain separate; only the approved accounting layer contributes, never both the engineering result and its raw members

#### Scenario: KN reserved name only
<!-- scenario-id: DHR-R5-S03 -->

- **GIVEN** an engineering slot has no approved result contract or selected mode
- **WHEN** onboarding opens
- **THEN** the engineering row is labeled not configured; activating it requires an engineering contract, not a physical meter ID or Item, and no numeric zero is fabricated

<!-- @trace
source: redesign-data-hub-reception-workspace
updated: 2026-09-16
code:
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.ts
  - packages/shared/src/mqttObservation.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/services/engineeringSourceService.ts
  - apps/server/src/services/engineeringReportService.ts
  - apps/server/src/services/sourceEditCollectionService.ts
  - apps/web/src/pages/DataHub/ReceivedDataWorkspace.tsx
  - apps/server/src/routes/engineering-sources.ts
  - packages/shared/src/siteEnergyProfile.ts
  - packages/shared/src/engineeringSources.ts
  - apps/server/src/routes/data-hub-source-mappings.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx
  - apps/server/src/db/migrations/053_data_hub_source_edit_transactions.sql
  - apps/web/src/pages/DataHub/ReceptionScopePicker.tsx
  - apps/server/src/db/migrations/054_engineering_sources_and_reports.sql
  - apps/web/src/pages/DataHub/ReceivedCandidateList.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/sourceEditValidationService.ts
  - apps/web/src/pages/DataHub/ReceivedSampleDrawer.tsx
  - apps/web/src/pages/DataHub/ConfiguredSourcesView.tsx
  - packages/shared/src/index.ts
  - apps/server/src/services/mqttObservationCatalogService.ts
  - packages/shared/src/engineeringGate.ts
  - packages/shared/src/powerMqttPublishingContract.ts
  - apps/server/src/services/sourceEditTransactionService.ts
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - apps/web/src/pages/DataHub/workspaceContext.ts
  - packages/shared/src/dataHubSourceTransactions.ts
  - packages/shared/src/engineeringPeriodResults.ts
  - apps/web/src/pages/DataHub/CaptureStatusBar.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - apps/server/src/services/sourceEditReceiptService.ts
tests:
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.test.tsx
  - packages/shared/src/engineeringSources.test.ts
  - packages/shared/src/powerMqttPublishingContract.test.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.test.tsx
  - packages/shared/src/engineeringGate.test.ts
  - packages/shared/src/siteEnergyProfileV2.test.ts
  - packages/shared/src/engineeringPeriodResults.test.ts
  - apps/web/src/pages/DataHub/SourcesModelTransactions.test.ts
  - apps/server/src/services/engineeringRolloutMigration.test.ts
  - apps/server/src/services/engineeringServices.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionDiagnostics.test.tsx
  - apps/web/src/pages/DataHub/workspaceContext.test.ts
  - apps/server/src/routes/data-hub-source-edit-transactions.test.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.test.ts
  - packages/shared/src/mqttObservation.test.ts
  - packages/shared/src/engineeringDisplayBinding.test.ts
  - apps/web/src/pages/DataHub/ReceptionWorkspace.test.tsx
  - apps/server/src/routes/engineering-sources.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.test.tsx
  - apps/server/src/routes/mqtt-captures.test.ts
-->

---
### Requirement: Source inspection has one task-oriented information hierarchy
<!-- requirement-id: DHI-R1 -->

The inspector SHALL expose the selected source identity, site, ownership, configuration state and observation provenance before technical detail. Overview, mapping, bounded received samples and usage SHALL be distinct sections. An already selected managed source SHALL not require another generic expand action to reveal its primary details.

#### Scenario: Open a managed source
<!-- scenario-id: DHI-R1-S01 -->

- **GIVEN** a Solar managed source has several resources
- **WHEN** its row is selected
- **THEN** the overview shows managed ownership, resource summary and a read-only explanation without pretending it has one missing generic value

#### Scenario: Usage request fails
<!-- scenario-id: DHI-R1-S02 -->

- **GIVEN** the operator opens usage and the request fails
- **WHEN** usage renders
- **THEN** the state is unknown with retry, not zero consumers or safe-to-delete

#### Scenario: No historical API
<!-- scenario-id: DHI-R1-S03 -->

- **GIVEN** only bounded current capture samples are available
- **WHEN** sample detail opens
- **THEN** the interface describes samples and their coverage rather than implying a complete history


<!-- @trace
source: refine-data-hub-source-inspector
updated: 2026-09-16
code:
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.ts
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - packages/shared/src/mqttObservation.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx
  - packages/shared/src/engineeringSources.ts
  - apps/web/src/pages/DataHub/ReceivedSampleDrawer.tsx
  - apps/server/src/services/mqttObservationCatalogService.ts
  - packages/shared/src/engineeringGate.ts
  - apps/web/src/pages/DataHub/ReceivedDataWorkspace.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx
  - apps/server/src/services/engineeringReportService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.tsx
  - apps/server/src/services/sourceEditCollectionService.ts
  - apps/server/src/db/migrations/053_data_hub_source_edit_transactions.sql
  - packages/shared/src/siteEnergyProfile.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DataHub/SourceInspectorUsagePanel.tsx
  - apps/web/src/pages/DataHub/ReceivedCandidateList.tsx
  - apps/server/src/routes/engineering-sources.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/sourceEditTransactionService.ts
  - packages/shared/src/powerMqttPublishingContract.ts
  - apps/server/src/services/sourceEditValidationService.ts
  - apps/server/src/services/sourceEditReceiptService.ts
  - apps/web/src/pages/DataHub/ReceptionScopePicker.tsx
  - apps/server/src/services/engineeringSourceService.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/server/src/app.ts
  - packages/shared/src/engineeringPeriodResults.ts
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
  - apps/server/src/routes/data-hub-source-mappings.ts
  - apps/server/src/db/migrations/054_engineering_sources_and_reports.sql
  - apps/web/src/pages/DataHub/useSourceEditorController.ts
  - apps/web/src/pages/DataHub/SourceInspectorOverview.tsx
  - apps/web/src/pages/DataHub/ConfiguredSourcesView.tsx
  - apps/web/src/pages/DataHub/CaptureStatusBar.tsx
  - apps/web/src/pages/DataHub/SourceInspectorMappingForm.tsx
  - packages/shared/src/dataHubSourceTransactions.ts
  - apps/web/src/pages/DataHub/workspaceContext.ts
tests:
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.test.tsx
  - apps/server/src/routes/data-hub-source-edit-transactions.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionDiagnostics.test.tsx
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.test.tsx
  - packages/shared/src/engineeringGate.test.ts
  - packages/shared/src/engineeringPeriodResults.test.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.test.ts
  - apps/server/src/services/engineeringServices.test.ts
  - packages/shared/src/powerMqttPublishingContract.test.ts
  - apps/web/src/pages/DataHub/SourceInspector.test.tsx
  - apps/web/src/pages/DataHub/ReceptionWorkspace.test.tsx
  - apps/server/src/routes/engineering-sources.test.ts
  - packages/shared/src/siteEnergyProfileV2.test.ts
  - packages/shared/src/mqttObservation.test.ts
  - apps/server/src/services/engineeringRolloutMigration.test.ts
  - apps/web/src/pages/DataHub/workspaceContext.test.ts
  - apps/server/src/routes/mqtt-captures.test.ts
  - packages/shared/src/engineeringDisplayBinding.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.test.tsx
  - packages/shared/src/engineeringSources.test.ts
  - apps/web/src/pages/DataHub/SourcesModelTransactions.test.ts
-->

---
### Requirement: Inspector fields adapt to the actual container
<!-- requirement-id: DHI-R2 -->

The inspector SHALL arrange readable fields from its actual available content width, provide full-width long technical values, and keep field labels, errors and actions reachable without page-level horizontal scrolling. Visual density SHALL distinguish headings, supporting metadata and primary actions.

#### Scenario: Large viewport narrow inspector
<!-- scenario-id: DHI-R2-S01 -->

- **GIVEN** the viewport is 1920 pixels wide but inspector content is narrower than 640 pixels
- **WHEN** mapping fields render
- **THEN** fields use one column rather than the desktop 12-column layout

#### Scenario: Long topic and translated labels
<!-- scenario-id: DHI-R2-S02 -->

- **GIVEN** a topic is very long and labels wrap
- **WHEN** the inspector renders at 390 CSS pixels
- **THEN** values can be inspected and copied completely while the page does not overflow horizontally


<!-- @trace
source: refine-data-hub-source-inspector
updated: 2026-09-16
code:
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.ts
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - packages/shared/src/mqttObservation.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx
  - packages/shared/src/engineeringSources.ts
  - apps/web/src/pages/DataHub/ReceivedSampleDrawer.tsx
  - apps/server/src/services/mqttObservationCatalogService.ts
  - packages/shared/src/engineeringGate.ts
  - apps/web/src/pages/DataHub/ReceivedDataWorkspace.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx
  - apps/server/src/services/engineeringReportService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.tsx
  - apps/server/src/services/sourceEditCollectionService.ts
  - apps/server/src/db/migrations/053_data_hub_source_edit_transactions.sql
  - packages/shared/src/siteEnergyProfile.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DataHub/SourceInspectorUsagePanel.tsx
  - apps/web/src/pages/DataHub/ReceivedCandidateList.tsx
  - apps/server/src/routes/engineering-sources.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/sourceEditTransactionService.ts
  - packages/shared/src/powerMqttPublishingContract.ts
  - apps/server/src/services/sourceEditValidationService.ts
  - apps/server/src/services/sourceEditReceiptService.ts
  - apps/web/src/pages/DataHub/ReceptionScopePicker.tsx
  - apps/server/src/services/engineeringSourceService.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/server/src/app.ts
  - packages/shared/src/engineeringPeriodResults.ts
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
  - apps/server/src/routes/data-hub-source-mappings.ts
  - apps/server/src/db/migrations/054_engineering_sources_and_reports.sql
  - apps/web/src/pages/DataHub/useSourceEditorController.ts
  - apps/web/src/pages/DataHub/SourceInspectorOverview.tsx
  - apps/web/src/pages/DataHub/ConfiguredSourcesView.tsx
  - apps/web/src/pages/DataHub/CaptureStatusBar.tsx
  - apps/web/src/pages/DataHub/SourceInspectorMappingForm.tsx
  - packages/shared/src/dataHubSourceTransactions.ts
  - apps/web/src/pages/DataHub/workspaceContext.ts
tests:
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.test.tsx
  - apps/server/src/routes/data-hub-source-edit-transactions.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionDiagnostics.test.tsx
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.test.tsx
  - packages/shared/src/engineeringGate.test.ts
  - packages/shared/src/engineeringPeriodResults.test.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.test.ts
  - apps/server/src/services/engineeringServices.test.ts
  - packages/shared/src/powerMqttPublishingContract.test.ts
  - apps/web/src/pages/DataHub/SourceInspector.test.tsx
  - apps/web/src/pages/DataHub/ReceptionWorkspace.test.tsx
  - apps/server/src/routes/engineering-sources.test.ts
  - packages/shared/src/siteEnergyProfileV2.test.ts
  - packages/shared/src/mqttObservation.test.ts
  - apps/server/src/services/engineeringRolloutMigration.test.ts
  - apps/web/src/pages/DataHub/workspaceContext.test.ts
  - apps/server/src/routes/mqtt-captures.test.ts
  - packages/shared/src/engineeringDisplayBinding.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.test.tsx
  - packages/shared/src/engineeringSources.test.ts
  - apps/web/src/pages/DataHub/SourcesModelTransactions.test.ts
-->

---
### Requirement: Inspector expansion preserves the same draft and evidence
<!-- requirement-id: DHI-R3 -->

The inspector SHALL allow a complex editing task to expand into a full workspace without losing its draft, selected sample revision, errors or return context. Presentation mode SHALL not create a second independently saveable copy. Only one coherent primary persistence action SHALL be presented for its actual transaction scope.

#### Scenario: Expand while dirty
<!-- scenario-id: DHI-R3-S01 -->

- **GIVEN** the source draft contains unsaved name and selector changes
- **WHEN** the operator expands and later returns to the inspector
- **THEN** the same changes and selected evidence remain and no write occurred

#### Scenario: Save within the modal
<!-- scenario-id: DHI-R3-S02 -->

- **GIVEN** a valid single-source edit is ready and E transaction support is enabled
- **WHEN** the operator saves from the footer
- **THEN** only the named source transaction is submitted and feedback remains visible inside the inspector

#### Scenario: Legacy save still active
<!-- scenario-id: DHI-R3-S03 -->

- **GIVEN** only the previous full-list save is available
- **WHEN** the transitional inspector offers persistence
- **THEN** it clearly labels the full change count and never claims to save one row


<!-- @trace
source: refine-data-hub-source-inspector
updated: 2026-09-16
code:
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.ts
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - packages/shared/src/mqttObservation.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx
  - packages/shared/src/engineeringSources.ts
  - apps/web/src/pages/DataHub/ReceivedSampleDrawer.tsx
  - apps/server/src/services/mqttObservationCatalogService.ts
  - packages/shared/src/engineeringGate.ts
  - apps/web/src/pages/DataHub/ReceivedDataWorkspace.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx
  - apps/server/src/services/engineeringReportService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.tsx
  - apps/server/src/services/sourceEditCollectionService.ts
  - apps/server/src/db/migrations/053_data_hub_source_edit_transactions.sql
  - packages/shared/src/siteEnergyProfile.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DataHub/SourceInspectorUsagePanel.tsx
  - apps/web/src/pages/DataHub/ReceivedCandidateList.tsx
  - apps/server/src/routes/engineering-sources.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/sourceEditTransactionService.ts
  - packages/shared/src/powerMqttPublishingContract.ts
  - apps/server/src/services/sourceEditValidationService.ts
  - apps/server/src/services/sourceEditReceiptService.ts
  - apps/web/src/pages/DataHub/ReceptionScopePicker.tsx
  - apps/server/src/services/engineeringSourceService.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/server/src/app.ts
  - packages/shared/src/engineeringPeriodResults.ts
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
  - apps/server/src/routes/data-hub-source-mappings.ts
  - apps/server/src/db/migrations/054_engineering_sources_and_reports.sql
  - apps/web/src/pages/DataHub/useSourceEditorController.ts
  - apps/web/src/pages/DataHub/SourceInspectorOverview.tsx
  - apps/web/src/pages/DataHub/ConfiguredSourcesView.tsx
  - apps/web/src/pages/DataHub/CaptureStatusBar.tsx
  - apps/web/src/pages/DataHub/SourceInspectorMappingForm.tsx
  - packages/shared/src/dataHubSourceTransactions.ts
  - apps/web/src/pages/DataHub/workspaceContext.ts
tests:
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.test.tsx
  - apps/server/src/routes/data-hub-source-edit-transactions.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionDiagnostics.test.tsx
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.test.tsx
  - packages/shared/src/engineeringGate.test.ts
  - packages/shared/src/engineeringPeriodResults.test.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.test.ts
  - apps/server/src/services/engineeringServices.test.ts
  - packages/shared/src/powerMqttPublishingContract.test.ts
  - apps/web/src/pages/DataHub/SourceInspector.test.tsx
  - apps/web/src/pages/DataHub/ReceptionWorkspace.test.tsx
  - apps/server/src/routes/engineering-sources.test.ts
  - packages/shared/src/siteEnergyProfileV2.test.ts
  - packages/shared/src/mqttObservation.test.ts
  - apps/server/src/services/engineeringRolloutMigration.test.ts
  - apps/web/src/pages/DataHub/workspaceContext.test.ts
  - apps/server/src/routes/mqtt-captures.test.ts
  - packages/shared/src/engineeringDisplayBinding.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.test.tsx
  - packages/shared/src/engineeringSources.test.ts
  - apps/web/src/pages/DataHub/SourcesModelTransactions.test.ts
-->

---
### Requirement: Inspector identifies publisher and source family without offering upstream mutation
<!-- requirement-id: DHI-R4 -->

The inspector SHALL distinguish the upstream publisher from the Player production subscriber and the temporary discovery subscriber. It SHALL distinguish managed Solar, reviewed physical power, authoritative engineering results and unreviewed calculation-only evidence. Reviewed engineering results SHALL be usable without physical meter/Item inputs, with engineering identity, mode, usable period and data revisions visible; detailed engineering behavior SHALL follow KNE/EPR. A publisher-declared ID SHALL remain a claim unless authenticated metadata proves it. Publisher configuration SHALL remain outside receiver edit controls.

#### Scenario: Managed Solar selection
<!-- scenario-id: DHI-R4-S01 -->

- **GIVEN** a standard Solar summary or whole-zone source is selected
- **WHEN** the inspector opens
- **THEN** the source is already managed, its canonical metrics are reusable, and there is no generic remapping or upstream broker-edit action

#### Scenario: Virtual power aggregate
<!-- scenario-id: DHI-R4-S02 -->

- **GIVEN** a publisher emits an unreviewed comparison sum of several raw counters
- **WHEN** its detail opens
- **THEN** the comparison-only status is shown rather than counting it as another physical meter; a separately reviewed engineering result is not rejected merely because it was calculated upstream

#### Scenario: DDE timing limitation
<!-- scenario-id: DHI-R4-S03 -->

- **GIVEN** a successful DDE numeric read has no source event timestamp or device quality
- **WHEN** its sample is inspected
- **THEN** read time, publish time, receiver time and unknown source quality remain separately labeled; a green connection does not imply a fresh device measurement

<!-- @trace
source: refine-data-hub-source-inspector
updated: 2026-09-16
code:
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.ts
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - packages/shared/src/mqttObservation.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx
  - packages/shared/src/engineeringSources.ts
  - apps/web/src/pages/DataHub/ReceivedSampleDrawer.tsx
  - apps/server/src/services/mqttObservationCatalogService.ts
  - packages/shared/src/engineeringGate.ts
  - apps/web/src/pages/DataHub/ReceivedDataWorkspace.tsx
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx
  - apps/server/src/services/engineeringReportService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.tsx
  - apps/server/src/services/sourceEditCollectionService.ts
  - apps/server/src/db/migrations/053_data_hub_source_edit_transactions.sql
  - packages/shared/src/siteEnergyProfile.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DataHub/SourceInspectorUsagePanel.tsx
  - apps/web/src/pages/DataHub/ReceivedCandidateList.tsx
  - apps/server/src/routes/engineering-sources.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/sourceEditTransactionService.ts
  - packages/shared/src/powerMqttPublishingContract.ts
  - apps/server/src/services/sourceEditValidationService.ts
  - apps/server/src/services/sourceEditReceiptService.ts
  - apps/web/src/pages/DataHub/ReceptionScopePicker.tsx
  - apps/server/src/services/engineeringSourceService.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - apps/server/src/app.ts
  - packages/shared/src/engineeringPeriodResults.ts
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
  - apps/server/src/routes/data-hub-source-mappings.ts
  - apps/server/src/db/migrations/054_engineering_sources_and_reports.sql
  - apps/web/src/pages/DataHub/useSourceEditorController.ts
  - apps/web/src/pages/DataHub/SourceInspectorOverview.tsx
  - apps/web/src/pages/DataHub/ConfiguredSourcesView.tsx
  - apps/web/src/pages/DataHub/CaptureStatusBar.tsx
  - apps/web/src/pages/DataHub/SourceInspectorMappingForm.tsx
  - packages/shared/src/dataHubSourceTransactions.ts
  - apps/web/src/pages/DataHub/workspaceContext.ts
tests:
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.test.tsx
  - apps/server/src/routes/data-hub-source-edit-transactions.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionDiagnostics.test.tsx
  - apps/web/src/pages/DataHub/KnEngineeringSourcesView.test.tsx
  - packages/shared/src/engineeringGate.test.ts
  - packages/shared/src/engineeringPeriodResults.test.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.test.ts
  - apps/server/src/services/engineeringServices.test.ts
  - packages/shared/src/powerMqttPublishingContract.test.ts
  - apps/web/src/pages/DataHub/SourceInspector.test.tsx
  - apps/web/src/pages/DataHub/ReceptionWorkspace.test.tsx
  - apps/server/src/routes/engineering-sources.test.ts
  - packages/shared/src/siteEnergyProfileV2.test.ts
  - packages/shared/src/mqttObservation.test.ts
  - apps/server/src/services/engineeringRolloutMigration.test.ts
  - apps/web/src/pages/DataHub/workspaceContext.test.ts
  - apps/server/src/routes/mqtt-captures.test.ts
  - packages/shared/src/engineeringDisplayBinding.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.test.tsx
  - packages/shared/src/engineeringSources.test.ts
  - apps/web/src/pages/DataHub/SourcesModelTransactions.test.ts
-->