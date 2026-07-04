# overview-weather-card-cpu-optimize Specification

## Purpose

TBD - created by archiving change 'optimize-weather-card-cpu'. Update Purpose after archive.

## Requirements

### Requirement: Overview weather card CPU optimization for rain animation
The weather card SHALL render the rain animation using only GPU-accelerated CSS properties (transform) to prevent CPU paint operations.

#### Scenario: Rain animation uses GPU translation
- **WHEN** the weather card renders rain condition
- **THEN** the rain drops SVG group SHALL apply CSS translateY animation
- **AND** the rain drops SHALL be clipped using SVG clipPath to hide out-of-bound rain drops
- **AND** the CSS SHALL NOT apply repaint-heavy animations like stroke-dashoffset on the rain drops

<!-- @trace
source: optimize-weather-card-cpu
updated: 2026-07-04
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
-->