## ADDED Requirements

### Requirement: Migrate the declared display surface routes onto the shared playback canvas shell

The implementation SHALL migrate only the declared display surface routes `/overview`, `/solar`, `/images`, `/trends`, `/history`, `/slideshow-preview`, and `/device-status` onto the shared playback canvas shell, and SHALL NOT expand this change to settings-form routes or unrelated page groups.

#### Scenario: The display surface batch begins

- **WHEN** this change is applied
- **THEN** `/overview`, `/solar`, `/images`, `/trends`, `/history`, `/slideshow-preview`, and `/device-status` are the only routes in scope for page-body reference alignment
- **AND** `/settings/playback`, `/settings/images`, `/settings/mqtt`, and `/settings/circuits` remain out of scope for this change

##### Example: route scope stays narrow

- **GIVEN** the audit file already maps all 14 routes to reference pages
- **WHEN** an implementer starts this change
- **THEN** they align only the seven declared display surface routes
- **AND** they do not treat management form pages as part of the same migration batch

### Requirement: Align display surface page bodies to reference compositions through page-local layout constants and asset mapping

Each in-scope display surface route SHALL render through the shared playback canvas shell, SHALL use page-local layout constants for reference geometry, and SHALL map page assets through declared asset helpers or fallback sources instead of ad hoc JSX literals or emoji-driven placeholder visuals.

#### Scenario: An in-scope display route renders

- **WHEN** any of the seven in-scope display surface routes renders
- **THEN** its page body uses the shared playback shell rather than the dashboard `PageScaffold` title block as the primary composition model
- **AND** its major regions are positioned through page-local layout constants derived from the matching reference HTML and page CSS
- **AND** its asset usage is routed through declared asset mapping or fallback binding helpers

##### Example: solar and overview adopt page-local geometry

- **GIVEN** `/overview` maps to `01-overview.html` and `/solar` maps to `02-solar.html`
- **WHEN** those routes are migrated in this change
- **THEN** each route resolves its major hero, KPI, flow, chart, or media regions from page-local layout constants
- **AND** the page body no longer depends on the generic title-block-first dashboard structure

### Requirement: Preserve existing route-level data hooks, view-models, and fallback contracts during display page migration

The display surface migration SHALL preserve the existing route-level hooks, view-models, fallback values, and service contracts for the seven in-scope routes while replacing only the view-layer composition.

#### Scenario: Live or mock data is incomplete during rendering

- **WHEN** an in-scope display route renders with live data, mock data, or fallback data that is partial or unavailable
- **THEN** the route continues to use its current hook, view-model, and fallback contract to produce visible content
- **AND** the migration does not require a new backend endpoint, a new socket payload, or a changed route contract just to satisfy the reference layout

##### Example: images and slideshow preview keep existing runtime contracts

- **GIVEN** `/images` currently relies on mock or fallback slide assets and `/slideshow-preview` relies on the existing playback controller state
- **WHEN** those routes are visually migrated
- **THEN** they keep the same underlying data contract and fallback behavior
- **AND** only the page-body layout, asset presentation, and component props change
