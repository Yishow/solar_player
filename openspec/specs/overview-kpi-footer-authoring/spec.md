# overview-kpi-footer-authoring Specification

## Purpose

TBD - created by archiving change 'add-overview-kpi-footers-and-widget-details'. Update Purpose after archive.

## Requirements

### Requirement: Author Overview KPI Card Footer Types

The system SHALL allow an operator to configure the footer layout type (`footerType`) for each of the five Overview KPI cards. The supported footer types SHALL include `sparkline` (area trend line), `progress` (completion bar), `text` (custom information string), `co2-tree` (ecological planting equivalent), and `none` (no footer). The schema SHALL support custom properties `footerText` for `text` footers and `targetValue` for `progress` footers.

#### Scenario: Operator configures progress footer

- **WHEN** an operator selects `progress` as the footer type for the today generation card and sets `targetValue` to `5000`
- **THEN** the today generation card renders a progress bar reflecting the current reading relative to 5000 kWh

#### Scenario: Missing configuration falls back to seed default

- **WHEN** the persisted page configuration lacks a `footerType` attribute for a card
- **THEN** the system SHALL fallback to the predefined seed footer configuration (e.g., progress for today, text for total, co2-tree for CO2 cards)


<!-- @trace
source: add-overview-kpi-footers-and-widget-details
updated: 2026-06-08
code:
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/overview.css
tests:
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
-->