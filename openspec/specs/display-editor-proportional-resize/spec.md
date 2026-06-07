# display-editor-proportional-resize Specification

## Purpose

TBD - created by archiving change 'extend-display-card-visibility-and-aspect-lock'. Update Purpose after archive.

## Requirements

### Requirement: Region geometry supports a proportional resize mode

The region geometry schema SHALL support a `resizeMode` value of `"proportional"`. When a region declares `resizeMode` `"proportional"`, canvas resize interactions SHALL maintain the region's starting aspect ratio: a change driven along one axis SHALL derive the other axis so that width divided by height equals the region's aspect ratio at the start of the interaction. Minimum and maximum size constraints SHALL still apply; when a constraint is reached, the resize SHALL clamp on the constrained axis and derive the other axis to preserve the ratio. A region that does not declare `resizeMode` `"proportional"` SHALL retain its existing resize behavior unchanged.

#### Scenario: Proportional resize preserves aspect ratio

- **WHEN** the operator resizes a region whose `resizeMode` is `"proportional"`
- **THEN** the resulting width-to-height ratio equals the region's aspect ratio at the start of the interaction

#### Scenario: Non-proportional region keeps existing behavior

- **WHEN** the operator resizes a region whose `resizeMode` is not `"proportional"`
- **THEN** the resize behaves as it did before this capability, with no aspect-ratio locking

##### Example: Overview KPI card resized proportionally

- **GIVEN** an Overview KPI region with `resizeMode` `"proportional"` and a starting frame of width 352 and height 220
- **WHEN** the operator drags a corner handle to increase the width
- **THEN** the height increases so the frame keeps the original 352-to-220 aspect ratio within a one-pixel rounding tolerance

<!-- @trace
source: extend-display-card-visibility-and-aspect-lock
updated: 2026-06-07
code:
  - uploads/overview_bg-3.png
  - apps/web/src/hooks/useOverviewWeather.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - uploads/overview_bg-1.png
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/layout.ts
  - uploads/overview_bg-4.png
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/overview.css
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
tests:
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->