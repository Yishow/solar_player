## ADDED Requirements

### Requirement: Task entry points coexist with direct specialist routes
<!-- requirement-id: U1-R1 -->

Data Hub SHALL provide connect-new-data, edit-existing-data and diagnose-data tasks while retaining directly addressable connection, source, metric and external-data routes. Existing legacy redirects SHALL preserve supported scope and metric filters.

#### Scenario: Task landing
<!-- scenario-id: U1-R1-S01 -->

- **GIVEN** an authorized operator opens the Data Hub root
- **WHEN** the page loads
- **THEN** the three tasks and scoped health summary are visible without requiring terminology knowledge

#### Scenario: Legacy diagnostics bookmark
<!-- scenario-id: U1-R1-S02 -->

- **GIVEN** a bookmark includes an old diagnostics path with scope=kn and a metric key
- **WHEN** the router redirects
- **THEN** the consolidated metrics view preserves KN and the requested metric

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

### Requirement: Filtering and refresh cannot discard other scopes or drafts
<!-- requirement-id: U1-R5 -->

Saving a filtered source view SHALL preserve sources outside that filter. Live observation refresh SHALL not overwrite editable drafts. Navigation with unsaved edits SHALL preserve the draft or require an explicit discard decision.

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

### Requirement: The workspace remains usable with keyboard and smaller desktops
<!-- requirement-id: U1-R6 -->

Task navigation, lists, drawers and critical actions SHALL be keyboard operable, have visible focus and textual status, and remain usable at 1366x768, 1440x900 and 1920x1080. No status SHALL depend on color alone.

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

### Requirement: DataHub starts source tasks from received-data inventory
<!-- requirement-id: U1-R8 -->

The DataHub source workspace SHALL expose the M1 observed-data catalog and M2 add-from-received-data action before requiring a technical mapping form. Existing topic subscriptions SHALL not be presented as an inventory of all available meters. The task SHALL preserve concrete site and return context; missing permissions or scope setup SHALL be resolved inline where authorized.

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

