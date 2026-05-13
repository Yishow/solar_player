## ADDED Requirements

### Requirement: Align overview and solar pages as the first playback witness batch

The implementation SHALL migrate `/overview` and `/solar` as the first playback witness batch, without mixing in the remaining playback routes.

#### Scenario: The first playback batch starts

- **WHEN** the first playback batch begins
- **THEN** the batch is limited to `/overview` and `/solar`
- **AND** `/factory-circuit`, `/images`, and `/sustainability` remain out of scope for this change

##### Example:

- **GIVEN** the shell foundation already exists
- **WHEN** this change is applied
- **THEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html` maps to `/overview` and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` maps to `/solar`
- **AND** the other playback pages remain untouched by this change

### Requirement: Preserve playback runtime behavior for overview and solar

The implementation SHALL preserve route rotation, offline redirect behavior, and live metric fallback for `/overview` and `/solar`.

#### Scenario: Connectivity changes during the first playback batch

- **WHEN** the application loses connectivity or rotates playback routes
- **THEN** `/overview` and `/solar` keep the existing route rotation and offline redirect behavior
- **AND** the visual migration does not introduce a new routing contract

##### Example:

- **GIVEN** `/overview` and `/solar` are already visually aligned
- **WHEN** the MQTT or socket connection drops
- **THEN** the application still yields to the existing offline behavior
- **AND** route rotation semantics remain unchanged

### Requirement: Centralize overview and solar display mapping

The implementation SHALL centralize prototype display mapping for `/overview` and `/solar` in page-local adapters or view-models.

#### Scenario: A prototype KPI or hero field needs runtime data

- **WHEN** a prototype-aligned region on `/overview` or `/solar` needs runtime data
- **THEN** the mapping is defined in a page-local adapter or view-model
- **AND** JSX does not duplicate reference-only or fallback classification logic across multiple branches

##### Example:

- **GIVEN** `/overview` needs to render prototype KPI tiles with live metric fallbacks
- **WHEN** the page is implemented
- **THEN** the display-field transformation is centralized before render
- **AND** the page body consumes prepared display data rather than raw metric-shape branching everywhere
