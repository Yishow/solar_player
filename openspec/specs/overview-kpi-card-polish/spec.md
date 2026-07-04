# overview-kpi-card-polish Specification

## Purpose

TBD - created by archiving change 'polish-overview-kpi-cards'. Update Purpose after archive.

## Requirements

### Requirement: Overview KPI card layout and uniform spacing
The Overview display page SHALL arrange the five KPI cards horizontally with uniform spacing (gaps) and width, and a uniform height of 180px in a 1920x1080 FHD resolution. The cards SHALL NOT overlap the upper hero media band or the lower density widget row.

#### Scenario: Uniform horizontal layout at FHD
- **WHEN** the Overview page resolves layout configuration for the 1920x1080 viewport
- **THEN** all five KPI cards share identical height and are positioned with symmetrical horizontal margins and equal gaps
- **AND** the top offsets of all five KPI cards do not overlap with the hero container or the widget elements


<!-- @trace
source: polish-overview-kpi-cards
updated: 2026-07-04
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
tests:
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->

---
### Requirement: Frosted glass styling on Overview KPI cards
The Overview KPI cards SHALL use a frosted glass styling consisting of a translucent background gradient, a fine border, and backdrop filter blur.

#### Scenario: Frosted glass parameters applied
- **WHEN** the Overview KPI cards render on the page
- **THEN** the cards render with a translucent background gradient, a thin white border, and backdrop blur
- **AND** the styles are scoped exclusively to the Overview page to avoid affecting other playback pages


<!-- @trace
source: polish-overview-kpi-cards
updated: 2026-07-04
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
tests:
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->

---
### Requirement: Hover micro-interactions on Overview KPI cards
The Overview KPI cards SHALL transition visually when hovered, including a vertical shift (translateY), a dynamic shadow increase, and a border color highlight.

#### Scenario: Hover transition triggers
- **WHEN** a user hovers a pointer over an Overview KPI card
- **THEN** the card transitions its CSS transform to shift upward by 4px
- **AND** the box-shadow strength increases and the border color changes to an accent green color


<!-- @trace
source: polish-overview-kpi-cards
updated: 2026-07-04
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
tests:
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->

---
### Requirement: KPI card default styles and CO2 indicator animation
The default shape of the Overview KPI card icon chips SHALL be rounded-square. The CO2 tree equivalent indicator dot SHALL render a pulsing breathing animation.

#### Scenario: Rounded-square icon and pulsing dot
- **WHEN** `/overview` renders the KPI cards
- **THEN** the icon chips render as rounded-squares by default
- **AND** the CO2 tree equivalent indicator dot pulses visually via a CSS keyframe animation

<!-- @trace
source: polish-overview-kpi-cards
updated: 2026-07-04
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
tests:
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->