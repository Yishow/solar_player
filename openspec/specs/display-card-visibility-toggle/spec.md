# display-card-visibility-toggle Specification

## Purpose

TBD - created by archiving change 'extend-display-card-visibility-and-aspect-lock'. Update Purpose after archive.

## Requirements

### Requirement: Display card visibility is controlled by a per-card visible flag

The system SHALL honor a per-card `visible` boolean flag on display card configuration. When a card's `visible` flag is `false`, the playback runtime SHALL NOT render that card. When the flag is `true` or absent, the playback runtime SHALL render that card. A card configuration that omits the `visible` flag SHALL be treated as visible, so existing drafts without the flag continue to render unchanged.

#### Scenario: Hidden card is not rendered at playback

- **WHEN** a display card's configuration sets `visible` to `false`
- **THEN** the playback runtime does not render that card

#### Scenario: Card without a visible flag still renders

- **WHEN** a display card's configuration omits the `visible` flag
- **THEN** the playback runtime renders that card as visible

##### Example: Overview KPI card hidden then restored

- **GIVEN** the Overview page has five KPI cards each defaulting to `visible` true
- **WHEN** the `power` KPI card configuration is set to `visible` false
- **THEN** the Overview playback output omits the `power` KPI card
- **AND** setting it back to `visible` true restores the rendered card


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

---
### Requirement: Editor exposes a visibility toggle that persists through draft and live publishing

The editor SHALL expose a visibility toggle control for cards that declare a visibility field, bound to the card's `visible` configuration path. Toggling the control SHALL update the page draft, and the draft value SHALL propagate to live through the existing draft and live publishing flow. A hidden card SHALL remain selectable in the editor so an operator can re-enable it.

#### Scenario: Operator toggles visibility and publishes

- **WHEN** the operator switches a card's visibility toggle off in the editor
- **THEN** the page draft records that card as not visible
- **AND** publishing the draft propagates the hidden state to the live display

##### Example: Overview power KPI is hidden in draft and live

- **GIVEN** the Overview `power` KPI card is visible in the editor draft
- **WHEN** the operator switches the `power` KPI visibility toggle off and publishes the draft
- **THEN** the draft and live configuration record `kpiCards.power.visible` as `false`
- **AND** the playback runtime omits the `power` KPI card

#### Scenario: Hidden card remains editable

- **WHEN** a card is hidden in the editor
- **THEN** the card remains present and selectable in the editor region list
- **AND** the operator can switch its visibility back on

##### Example: Hidden Overview KPI stays in the editor region list

- **GIVEN** the Overview `power` KPI card configuration has `visible` set to `false`
- **WHEN** the operator opens `/display-pages/editor` for Overview
- **THEN** the `overview-kpi-power` region remains selectable
- **AND** the visibility toggle can set `kpiCards.power.visible` back to `true`

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