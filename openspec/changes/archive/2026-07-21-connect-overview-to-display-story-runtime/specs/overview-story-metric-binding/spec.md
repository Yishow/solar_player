## ADDED Requirements

### Requirement: Drive Overview playback metrics from the shared display-story contract

The implementation SHALL make the `/overview` playback route resolve KPI cards and summary state from the shared `/api/display-story` overview payload instead of rebuilding that contract only from page-local metric wiring.

#### Scenario: Overview playback loads shared story metrics

- **WHEN** `/overview` requests the shared display story payload
- **THEN** the page uses `overview.metrics` and `overview.summary` as its primary playback data source
- **AND** the existing KPI order, labels, and FHD layout remain intact

##### Example: Overview cards use the server-provided story payload

- **GIVEN** `/api/display-story` returns an `overview` payload with five metrics and a summary state
- **WHEN** the playback route renders `/overview`
- **THEN** each KPI card resolves its displayed value from the shared story payload
- **AND** the summary block reflects the same shared story state instead of a second page-local interpretation

### Requirement: Keep Overview readable when shared story data is degraded

The implementation SHALL preserve a readable Overview playback surface when the shared story payload is missing, stale, or partially incomplete.

#### Scenario: Overview story payload is stale or incomplete

- **WHEN** the shared display story request fails or one or more bound metrics are unavailable
- **THEN** `/overview` still renders a complete playback layout
- **AND** the affected KPI or summary state falls back predictably without blanking the page

##### Example: One metric is missing but the page stays playable

- **GIVEN** `/api/display-story` returns four valid Overview metrics and one missing metric
- **WHEN** `/overview` renders the KPI row
- **THEN** the missing card shows a readable fallback value and status
- **AND** the rest of the page continues using the available shared story payload
