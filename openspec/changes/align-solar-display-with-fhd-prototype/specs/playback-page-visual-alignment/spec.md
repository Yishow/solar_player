## ADDED Requirements

### Requirement: Migrate playback pages in declared batches instead of one five-page rewrite

Playback pages `01-05` SHALL be migrated in the declared rollout order rather than as one undifferentiated batch.

#### Scenario: Playback batch A is started

- **GIVEN** the shared shell foundation has passed its exit criteria
- **WHEN** the first playback batch begins
- **THEN** the batch is limited to `/overview` and `/solar`
- **AND** `/factory-circuit`, `/images`, and `/sustainability` remain pending until later playback batches

##### Example:

- **GIVEN** the team has completed Phase 1 shell verification
- **WHEN** it begins Phase 2
- **THEN** it migrates `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html` to `/overview` and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` to `/solar`
- **AND** it does not claim `03-05` are covered by the same batch

#### Scenario: Playback batch B is started

- **GIVEN** playback batch A evidence is complete
- **WHEN** the second playback batch begins
- **THEN** the batch is limited to `/factory-circuit`
- **AND** the implementation explicitly addresses flow-diagram and circuit-status mapping for that route

##### Example:

- **GIVEN** `/overview` and `/solar` have already passed their runtime verification
- **WHEN** Phase 3 starts
- **THEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html` is mapped only to `/factory-circuit`
- **AND** the batch focuses on flow nodes, connectors, circuit thresholds, and empty-state behavior

#### Scenario: Playback batch C is started

- **GIVEN** playback batch B evidence is complete
- **WHEN** the third playback batch begins
- **THEN** the batch is limited to `/images` and `/sustainability`
- **AND** the implementation explicitly addresses media-slot and hero-storytelling composition for those routes

##### Example:

- **GIVEN** `/factory-circuit` has already passed its batch verification
- **WHEN** Phase 4 starts
- **THEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html` maps to `/images` and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html` maps to `/sustainability`
- **AND** the batch records how media placeholders and sustainability fallback summaries are handled

### Requirement: Preserve playback runtime behavior across all playback batches

Playback page migration SHALL preserve route rotation, offline redirect behavior, and current runtime data contracts across every playback batch.

#### Scenario: Page rotation is active

- **WHEN** automatic route rotation is enabled for playback pages
- **THEN** every migrated playback route still participates in the existing rotation flow
- **AND** the migration does not introduce a new routing contract

##### Example:

- **GIVEN** the playback configuration rotates `/overview`, `/solar`, `/factory-circuit`, `/images`, and `/sustainability`
- **WHEN** any one of those routes is visually migrated
- **THEN** it remains in the same rotation family and route order logic
- **AND** the change does not require a second router or a prototype-only route alias

#### Scenario: Offline fallback is triggered

- **WHEN** MQTT or socket connectivity falls back to the existing offline behavior
- **THEN** migrated playback pages still respect the current offline-capable route rules
- **AND** the visual migration does not suppress the existing offline redirect logic

##### Example:

- **GIVEN** `/overview` and `/solar` are already migrated
- **WHEN** the connectivity state drops and the application redirects to `/offline`
- **THEN** the migrated routes still yield to that redirect
- **AND** the UI does not leave stale live panels visible as if the route were still online

### Requirement: Degrade gracefully when playback data or media is unavailable

Playback page alignment SHALL preserve current fallback behavior for live data, circuit data, images, and sustainability summaries.

#### Scenario: Live metric is missing

- **WHEN** a migrated playback page cannot obtain a live metric for a prototype-aligned KPI region
- **THEN** the page shows the existing fallback or mock presentation for that region
- **AND** the layout remains structurally intact

##### Example:

- **GIVEN** `/overview` contains prototype-aligned KPI tiles
- **WHEN** the live metrics hook does not provide one of the required values
- **THEN** that tile uses the existing fallback pattern
- **AND** the KPI grid keeps the same card count and spacing

#### Scenario: Circuit data is missing

- **WHEN** `/factory-circuit` cannot obtain circuit rows or live circuit values
- **THEN** the page uses an explicit empty or fallback presentation
- **AND** the flow diagram and summary layout remain readable

##### Example:

- **GIVEN** the circuits API returns an empty list
- **WHEN** `/factory-circuit` renders
- **THEN** the page shows an intentional empty-state treatment instead of broken cards
- **AND** the route still keeps the same prototype-aligned section structure

#### Scenario: Media slot has no runtime asset

- **WHEN** a prototype-inspired media slot does not yet have a runtime asset bound to it
- **THEN** the page uses an explicit placeholder or current fallback asset behavior
- **AND** the route does not invent a new backend dependency just to satisfy the layout

##### Example:

- **GIVEN** `/images` reserves a large media frame based on `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html`
- **WHEN** no slideshow asset is available at runtime
- **THEN** the page renders the existing placeholder artwork or fallback media state
- **AND** the migration does not create a mandatory new media API
