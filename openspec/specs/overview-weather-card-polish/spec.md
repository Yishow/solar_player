# overview-weather-card-polish Specification

## Purpose

TBD - created by archiving change 'polish-overview-weather-card'. Update Purpose after archive.

## Requirements

### Requirement: Overview weather card icon rendering
The weather card SHALL render a dedicated weather SVG icon based on the current weather condition string. The SVG elements SHALL apply GPU-accelerated CSS animations (such as rotation or translation) for active weather representation. The weather icons MUST be rendered using multi-color layers for premium aesthetics and positioned properly without overlapping the card header.

#### Scenario: Condition-based icon selection
- **WHEN** the weather card is rendered with condition "晴" or "晴天" or "Sun"
- **THEN** the widget renders an SVG icon representing the sun with active rotation animation
- **WHEN** the weather card is rendered with condition "雨" or "下雨" or "Rain"
- **THEN** the widget renders a double-layered SVG icon representing rain with vertical falling animation
- **WHEN** the weather card is rendered with condition "雲" or "多雲" or "陰" or "Cloud" or "Overcast"
- **THEN** the widget renders an SVG icon representing a cloud with horizontal floating animation

---
### Requirement: Overview weather card temperature typography
The weather card SHALL render the temperature value, unit, location, and observation time with structured layout. The temperature value MUST render with font weight 800, and the unit "°C" MUST render with font weight 400. The location and observation time SHALL be rendered in a layout positioned below the primary temperature value block with a smaller font size to establish proper information hierarchy.

#### Scenario: Information hierarchy positioning
- **WHEN** the weather data is parsed and rendered
- **THEN** the numerical portion "28" renders inside a span with font weight 800
- **AND** the unit "°C" renders inside a span with font weight 400 and a smaller font size
- **AND** the location and observation time render in a metadata line positioned below the temperature value with a font size of 13px to 14px

---
### Requirement: Overview weather card grid indicators
The three bottom indicators representing humidity, wind speed, and precipitation SHALL render as separate rounded card blocks with a light translucent background and minimal SVG icons instead of system emojis. The indicator blocks SHALL animate their entrance in a staggered order, and SHALL render a subtle glowing pulse. All animations MUST be executed using only GPU-accelerated CSS properties (opacity and transform).

#### Scenario: Indicators render as card chips
- **WHEN** the weather indicators render on the page
- **THEN** each indicator block renders a dedicated custom line-art SVG icon corresponding to humidity, wind speed, or precipitation
- **AND** each indicator block is styled with a translucent background, border-radius, and a thin border
- **AND** the three indicator blocks fade in and translate upward in a staggered timeline sequence
- **AND** each block renders an inner radial gradient that pulses its opacity over time

---
### Requirement: Overview weather card load state skeleton
When the weather data is not ready or unavailable, the weather card SHALL render a skeleton loader consisting of translucent animated elements.

#### Scenario: Skeleton fallback renders
- **WHEN** weather data is not available
- **THEN** the weather card renders three pulsing rounded blocks representing the layout skeleton
- **AND** the card does not display the fallback text "天氣資料尚未就緒"


<!-- @trace
source: polish-overview-weather-card
updated: 2026-07-04
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
-->

---
### Requirement: No hover effects on weather card
The weather card SHALL NOT apply hover effects such as vertical transitions or shadow updates.

#### Scenario: Hovering does not trigger transition
- **WHEN** a pointer hovers over the weather card
- **THEN** the card remains completely static with no transform offset or shadow changes

<!-- @trace
source: polish-overview-weather-card
updated: 2026-07-04
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
-->

---
### Requirement: Overview weather card responsive themes
The weather card SHALL apply a weather-responsive visual theme by setting a specific CSS class on the card container based on the current weather condition. The CSS theme MUST define specific gradients and glow properties for Sunny, Rainy, and Cloudy conditions.

#### Scenario: Applied weather theme classes
- **WHEN** the weather condition is "晴" or "晴天" or "Sun"
- **THEN** the card container applies the CSS class "weather-sunny" with a warm golden gradient and golden glow
- **WHEN** the weather condition is "雨" or "下雨" or "Rain"
- **THEN** the card container applies the CSS class "weather-rainy" with a cool blue-gray gradient and blue-gray glow
- **WHEN** the weather condition is "雲" or "多雲" or "陰" or "Cloud" or "Overcast"
- **THEN** the card container applies the CSS class "weather-cloudy" with a light silver-gray gradient and subtle white glow
