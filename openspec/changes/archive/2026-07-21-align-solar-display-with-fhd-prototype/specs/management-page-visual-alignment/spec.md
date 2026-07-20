## ADDED Requirements

### Requirement: Migrate management routes in risk-based batches

Management and support pages `06-14` SHALL be migrated in risk-based batches rather than as one combined settings-and-monitoring rewrite.

#### Scenario: Low-risk settings batch is started

- **GIVEN** the shared shell and playback batches have established the prototype-aligned primitives
- **WHEN** the first management batch begins
- **THEN** the batch is limited to `/settings/playback` and `/settings/images`
- **AND** it does not include `/settings/mqtt` or `/settings/circuits`

##### Example:

- **GIVEN** the team has completed playback route migration evidence
- **WHEN** it starts Phase 5
- **THEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/07-playback-settings.html` maps to `/settings/playback` and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/08-image-management.html` maps to `/settings/images`
- **AND** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html` remains isolated for a later high-risk phase

#### Scenario: High-risk MQTT batch is started

- **GIVEN** low-risk settings evidence is complete
- **WHEN** the next management batch begins
- **THEN** the batch is limited to `/settings/mqtt`
- **AND** the batch includes dedicated validation for save, test, topic mapping, and error states

##### Example:

- **GIVEN** Phase 5 is complete
- **WHEN** Phase 6 starts
- **THEN** only `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html` is mapped to `/settings/mqtt`
- **AND** the implementation records separate proof for visual layout and interaction regression

#### Scenario: Monitoring and maintenance batch is started

- **GIVEN** settings-related phases have completed their verification
- **WHEN** the monitoring batch begins
- **THEN** the batch covers `/trends`, `/history`, `/offline`, `/slideshow-preview`, and `/device-status`
- **AND** each route keeps its runtime-sensitive behavior contract

##### Example:

- **GIVEN** Phases 5 through 7 are complete
- **WHEN** Phase 8 starts
- **THEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/06-energy-trend-summary.html`, `docs/reference/kuozui-green-fhd-html-prototype/html-pages/11-energy-data-history.html`, `docs/reference/kuozui-green-fhd-html-prototype/html-pages/12-offline-error-display.html`, `docs/reference/kuozui-green-fhd-html-prototype/html-pages/13-slideshow-preview.html`, and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/14-device-status-details.html` are mapped to their runtime routes
- **AND** the batch records read-density checks and behavior-sensitive checks separately

### Requirement: Preserve operational contracts for interactive management pages

Management-page visual migration SHALL preserve current request payloads, endpoint usage, save/test flows, CRUD flows, and status feedback semantics.

#### Scenario: Playback or image settings are saved after migration

- **WHEN** the user saves playback settings or updates image-management-related state
- **THEN** the page uses the same functional request flow currently required by the application
- **AND** the UI still reflects success and failure outcomes

##### Example:

- **GIVEN** `/settings/playback` updates playback schedule and page order
- **WHEN** the user saves the changes
- **THEN** the route still uses the existing playback API flow
- **AND** the page continues to show the same class of success or error feedback

#### Scenario: MQTT settings action fails

- **WHEN** a save, test connection, or topic mapping action fails on `/settings/mqtt`
- **THEN** the migrated page still surfaces an error or fallback message
- **AND** the visual refactor does not silently swallow the failure

##### Example:

- **GIVEN** the broker is unreachable during a test connection
- **WHEN** the user triggers the test action on `/settings/mqtt`
- **THEN** the page still shows the failed state and message outcome expected by current behavior
- **AND** the high-risk batch evidence records that failure mode explicitly

#### Scenario: Circuit settings CRUD action fails

- **WHEN** a create, update, delete, or load action fails on `/settings/circuits`
- **THEN** the migrated page still preserves the current error handling path
- **AND** the route remains usable after the failure

##### Example:

- **GIVEN** `/settings/circuits` fails to create a new circuit row
- **WHEN** the user submits the create action
- **THEN** the page still shows an error message instead of silently mutating the UI
- **AND** the form and existing list remain visible for recovery

### Requirement: Keep dense monitoring and maintenance content readable at FHD scale

Monitoring and maintenance routes SHALL provide readable FHD layouts for charts, tables, preview panes, offline notices, and device-maintenance controls.

#### Scenario: Topic, history, or device data is long

- **WHEN** a monitoring or maintenance route renders long values or dense rows
- **THEN** the page remains readable within the FHD canvas
- **AND** the visual migration does not force critical content below an unusable size

##### Example:

- **GIVEN** `/history` renders wide timestamp-plus-value rows and `/device-status` renders dense system information
- **WHEN** those values exceed a compact-card width
- **THEN** the layout preserves readable typography, wrapping, truncation, or scroll behavior appropriate for FHD
- **AND** action buttons and key status values remain visible

#### Scenario: Runtime-sensitive monitoring behavior is migrated

- **WHEN** `/offline` or `/slideshow-preview` is visually aligned to the prototype
- **THEN** the route still preserves reconnect, return navigation, playback controls, and preview progress semantics
- **AND** the migration does not reduce the route to a static mock page

##### Example:

- **GIVEN** `/offline` currently retries reconnection and `/slideshow-preview` currently controls page rotation
- **WHEN** those routes are migrated to prototype-aligned layouts
- **THEN** the reconnect countdown, restore navigation, prev/next/play controls, and progress bar semantics remain active
- **AND** the evidence bundle records those behavior checks
