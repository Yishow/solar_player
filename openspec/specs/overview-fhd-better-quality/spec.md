# overview-fhd-better-quality Specification

## Purpose

TBD - created by archiving change 'polish-overview-fhd-better-quality'. Update Purpose after archive.

## Requirements

### Requirement: Render Overview surfaces with frosted-glass quality scoped to Overview

The Overview display page SHALL render its KPI cards and density widgets with a frosted-glass treatment (translucent background, backdrop blur, thin border, soft shadow, consistent corner radius), and this treatment SHALL be scoped to Overview-only classes so the shared card component base and the other playback pages remain unchanged.

#### Scenario: Overview cards use frosted-glass treatment

- **WHEN** `/overview` renders its KPI cards and density widgets
- **THEN** each card uses a translucent background with backdrop blur, a thin border, and a soft shadow rather than a flat opaque fill

#### Scenario: Shared card base is not altered

- **WHEN** the frosted-glass treatment is applied
- **THEN** the shared card component stylesheet remains unchanged and the other playback pages keep their existing card appearance


<!-- @trace
source: polish-overview-fhd-better-quality
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/hooks/useOverviewWeather.ts
  - docs/reference/Better/01.Overivew (大).png
  - data/server-runtime.lock.json
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
tests:
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->

---
### Requirement: Compose Overview hero, density row, and KPI row without overlap

The Overview layout SHALL position the hero media, the density widget row, and the KPI card row as three non-overlapping vertical bands that fill the canvas with even rhythm.

#### Scenario: Three bands do not overlap

- **WHEN** the Overview layout is resolved at 1920x1080
- **THEN** the vertical extent of the density widget row does not overlap the hero media band or the KPI card row band

#### Scenario: Hero remains the primary visual

- **WHEN** the hero band renders
- **THEN** the hero media occupies the right-side primary visual area and the bilingual title group reads as the left-side secondary anchor


<!-- @trace
source: polish-overview-fhd-better-quality
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/hooks/useOverviewWeather.ts
  - docs/reference/Better/01.Overivew (大).png
  - data/server-runtime.lock.json
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
tests:
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->

---
### Requirement: Preserve light FHD canon and Overview-only scope

The change SHALL keep the existing light FHD color canon and SHALL NOT modify navigation, routing, server APIs, the SQLite schema, the MQTT architecture, or introduce a dark theme.

#### Scenario: No architectural or theme change

- **WHEN** the polish is applied
- **THEN** the color canon stays light, and navigation, routing, server APIs, and the database schema remain unchanged

#### Scenario: Configuration still expressed through editor-backed config

- **WHEN** layout coordinates or visibility change
- **THEN** they are expressed through the existing Overview config and seed, not a page-local hardcode that bypasses the editor

<!-- @trace
source: polish-overview-fhd-better-quality
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/hooks/useOverviewWeather.ts
  - docs/reference/Better/01.Overivew (大).png
  - data/server-runtime.lock.json
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
tests:
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->