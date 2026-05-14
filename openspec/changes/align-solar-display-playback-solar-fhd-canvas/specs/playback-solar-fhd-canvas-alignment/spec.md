## ADDED Requirements

### Requirement: Render the solar route inside a dedicated FHD playback canvas shell

The web application SHALL render `/solar` inside a playback-only shell that uses a 1920x1080 internal design canvas with viewport scaling, and SHALL NOT depend on the management-page `PageScaffold` title layout as the primary display structure.

#### Scenario: Solar playback opens on a non-FHD viewport

- **WHEN** the `/solar` route renders on a viewport that is smaller or larger than 1920x1080
- **THEN** the page still lays out content on a 1920x1080 internal coordinate system
- **AND** the shell scales to fit the viewport without changing the relative placement of the main display regions
- **AND** management routes remain free to keep their existing `PageScaffold` contract

##### Example: scaled playback shell

- **GIVEN** the browser viewport is 1366x768
- **WHEN** `/solar` renders
- **THEN** the shell preserves the same internal header, content, and footer geometry as the 1920x1080 design canvas
- **AND** the route does not fall back to a generic stacked dashboard layout

#### Scenario: The first solar FHD shell uses approved mock shell metadata

- **WHEN** the first solar FHD alignment round renders shell metadata
- **THEN** the shell shows the brand area, product title, clock, date, weather block, MQTT online status pill, footer navigation, page number pill, and decorative slogan or leaf elements
- **AND** the initial shell metadata is allowed to use approved mock values for time, date, weekday, weather, and status instead of introducing a new runtime API dependency

##### Example: approved first-round shell metadata

- **GIVEN** the first alignment round has no live clock or weather integration
- **WHEN** `/solar` renders its shell chrome
- **THEN** the clock shows `09:42`, the date shows `2025 / 05 / 26`, the weekday shows `星期一 Mon.`, the weather shows `晴 31°C`, and the status pill shows `MQTT Online`
- **AND** the route does not introduce a new shell-only API just to replace those values

### Requirement: Map the solar page composition and assets to the reference playback prototype

The `/solar` page SHALL align its main regions to `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html`, including the title group, leaf watermark, gold line, hero photo, four standalone flow nodes, three connectors, and five KPI cards, and SHALL bind the generated raster assets defined for the page.

#### Scenario: Solar composition is rendered on the FHD canvas

- **WHEN** `/solar` renders in playback mode
- **THEN** the hero media appears as a left-bottom banner region rather than a rounded dashboard media card
- **AND** the four flow nodes render as independent absolute-position nodes rather than a 2x2 grid panel
- **AND** the connector between inverter and carbon reduction includes the L-shaped vertical segment used by the reference composition
- **AND** the five KPI cards render as a bottom-row absolute layout on the same FHD canvas

##### Example: reference region mapping

- **GIVEN** the page uses the 1920x1080 design canvas
- **WHEN** the route renders its reference-aligned regions
- **THEN** the hero banner occupies the left-bottom media band, the flow nodes occupy the upper and right-side diagram zones, and the KPI row occupies the lower band
- **AND** the layout remains recognizably aligned with the reference even if minor pixel refinements are deferred

#### Scenario: Solar display icons use generated raster assets instead of emoji glyphs

- **WHEN** `/solar` renders the flow nodes and KPI cards
- **THEN** the flow nodes use the generated `solar-panel-display-source`, `inverter-display-source`, `factory-consumption-display-source`, and `carbon-reduction-display-source` assets
- **AND** the KPI cards use the generated `metric-generation-sun-source`, `metric-self-consumption-source`, `carbon-reduction-display-source`, `metric-co2-total-source`, and `metric-efficiency-source` assets
- **AND** the final visual presentation does not depend on emoji glyphs as the KPI icon system

### Requirement: Preserve live metric bindings and fallback behavior during solar visual migration

The solar playback migration SHALL preserve `useLiveMetrics()` connectivity handling, `buildSolarViewModel()` data mapping, existing fallback value behavior, and the current socket service contract while changing the visual structure.

#### Scenario: Live metrics are available

- **WHEN** the socket is connected and the required solar metrics are present
- **THEN** the solar title, flow nodes, and KPI cards render values derived from the existing live metric bindings
- **AND** the visual migration does not require a new backend endpoint or a new socket payload shape

##### Example: live solar metrics drive the display

- **GIVEN** `useLiveMetrics()` reports a connected socket and the snapshot includes `todayGeneration`, `selfConsumptionRatio`, `todayCo2Reduction`, `totalCo2Reduction`, and `systemEfficiency`
- **WHEN** `buildSolarViewModel()` resolves the solar display fields
- **THEN** the rendered flow nodes and KPI cards show values from those live metrics rather than fallback mock values
- **AND** the page still consumes the existing socket snapshot shape

#### Scenario: Live metrics are unavailable or incomplete

- **WHEN** the socket is disconnected or one of the required solar metrics is missing
- **THEN** the page continues to show the existing fallback values and helper copy produced by the current solar view-model behavior
- **AND** the FHD canvas remains structurally complete instead of leaving empty cards, broken nodes, or missing labels

##### Example: fallback-safe solar KPI rendering

- **GIVEN** `/solar` is rendered while the live metrics snapshot lacks one or more solar KPI values
- **WHEN** the page resolves its display model
- **THEN** the affected KPI cards and flow nodes use the existing fallback text and values
- **AND** the route still preserves the same number of cards and diagram nodes as the reference composition
