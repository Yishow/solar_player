# display-nav-route-icons Specification

## Purpose

TBD - created by archiving change 'add-display-nav-icons'. Update Purpose after archive.

## Requirements

### Requirement: Playback footer navigation renders a route icon beside each label

The playback footer navigation SHALL render a route-specific icon beside the text label for each playback route, without changing the route structure, order, count, or label text. Each playback route SHALL map to exactly one icon supplied through route metadata. The navigation SHALL continue to render the existing text label for every route (icon-and-text, not icon-only).

#### Scenario: Each playback route shows an icon and its label

- **WHEN** the playback footer navigation renders its route entries
- **THEN** each entry shows its route-specific icon together with the existing text label

##### Example: Playback route icons use the existing labels

- **GIVEN** the five playback routes keep their existing footer labels `總覽`, `太陽能`, `迴路`, `圖庫`, and `永續`
- **WHEN** the playback footer navigation renders those route entries
- **THEN** it shows route icons `overview`, `solar`, `factory-circuit`, `images`, and `sustainability` beside the matching labels

#### Scenario: Route structure and labels are unchanged

- **WHEN** the playback footer navigation renders with icons
- **THEN** the route paths, order, count, and label text are identical to before icons were added

##### Example: Overview entry renders icon and label

- **GIVEN** the five playback routes Overview, Solar, Factory Circuit, Images, and Sustainability
- **WHEN** the playback footer navigation renders the Overview entry
- **THEN** the Overview entry shows the `overview` route icon next to the existing text label `總覽`
- **AND** the entry still links to the `/overview` path


<!-- @trace
source: add-display-nav-icons
updated: 2026-06-07
code:
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/overview.css
  - uploads/overview_bg-1.png
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/viewModel.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/index.tsx
  - uploads/overview_bg-3.png
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/hooks/useOverviewWeather.ts
  - uploads/overview_bg-2.png
  - uploads/overview_bg-4.png
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Management footer navigation is unaffected by route icons

The management mode footer navigation SHALL remain unchanged by this capability and SHALL NOT render route icons.

#### Scenario: Management footer renders without route icons

- **WHEN** the footer navigation renders in management mode
- **THEN** it renders its existing entries without route icons

##### Example: MQTT settings footer remains text-only

- **GIVEN** the management footer renders for `/settings/mqtt`
- **WHEN** the footer shows the existing entries such as `回總覽` and `MQTT`
- **THEN** no management footer entry renders a route icon

<!-- @trace
source: add-display-nav-icons
updated: 2026-06-07
code:
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/overview.css
  - uploads/overview_bg-1.png
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/viewModel.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/index.tsx
  - uploads/overview_bg-3.png
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/hooks/useOverviewWeather.ts
  - uploads/overview_bg-2.png
  - uploads/overview_bg-4.png
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->