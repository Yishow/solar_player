## ADDED Requirements

### Requirement: Maintain a per-page prototype-to-runtime mapping for all 14 pages

The change artifacts SHALL define a per-page mapping between every prototype page `01-14` and its runtime React route counterpart.

#### Scenario: Implementer needs to migrate one page

- **WHEN** an implementer reads the change artifacts for a page migration
- **THEN** they can identify the prototype source page, the target React route, the page file, the major shared primitives involved, and the primary runtime data sources for that page

##### Example:

- **GIVEN** an implementer needs to migrate `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html`
- **WHEN** they read the mapping artifacts
- **THEN** they can trace it to `/settings/mqtt` and `apps/web/src/pages/MqttSettings/index.tsx`
- **AND** they can see which shared shell primitives, status components, and runtime sources are involved

#### Scenario: Reviewer checks page coverage

- **WHEN** a reviewer checks the proposal, design, specs, or tasks for this change
- **THEN** every prototype page `01-14` can be traced to a corresponding runtime page or shell work item
- **AND** no page is implicitly skipped without being recorded as out of scope

##### Example:

- **GIVEN** a reviewer audits the change before implementation begins
- **WHEN** they inspect the coverage table
- **THEN** `01-14` all appear with explicit runtime targets
- **AND** no row says only "same as previous page" or leaves the data-source field blank

### Requirement: Classify each mapped region as runtime-bound, reference-only, or fallback-only

The mapping contract SHALL classify each important page region so prototype sample values do not become accidental runtime requirements.

#### Scenario: Prototype contains placeholder numbers or provisional assets

- **WHEN** a prototype region contains a sample number, static label, or provisional image
- **THEN** the mapping marks it as reference-only unless the runtime already has a corresponding data source or asset contract
- **AND** the implementation is not allowed to treat that sample value as a new API requirement

##### Example:

- **GIVEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html` contains illustrative KPI numbers and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html` contains sample artwork
- **WHEN** the mapping is documented
- **THEN** those values are marked as reference-only unless the current application already exposes matching live values or slideshow assets
- **AND** the backend is not asked to produce the exact sample values

#### Scenario: A region depends on fallback behavior

- **WHEN** a page region must remain visible even without live runtime data
- **THEN** the mapping marks that region as fallback-only or fallback-capable
- **AND** the migration records what placeholder or mock contract will be used

##### Example:

- **GIVEN** `/images` does not always have a runtime slideshow asset
- **WHEN** the media frame is documented in the mapping
- **THEN** the artifact states that the frame uses placeholder or fallback behavior when assets are missing
- **AND** it does not pretend the slot is always runtime-bound

### Requirement: Record per-phase verification targets and evidence expectations

The mapping contract SHALL define the required verification targets, commands, and evidence expectations for each rollout phase.

#### Scenario: A page batch is reviewed

- **WHEN** any rollout phase is marked complete
- **THEN** the artifacts identify the routes, commands, screenshots, and manual review points required for that phase
- **AND** the next phase SHALL NOT be treated as ready until those verification targets are satisfied

##### Example:

- **GIVEN** the team completes the MQTT settings phase
- **WHEN** the phase is reviewed
- **THEN** the artifacts list the build command, the MQTT server tests, success and failure screenshots, and any unresolved edge-case note
- **AND** the following phase can verify that the high-risk batch gate has been satisfied
