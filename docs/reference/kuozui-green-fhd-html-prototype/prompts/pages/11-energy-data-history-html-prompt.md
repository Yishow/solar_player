You are a senior frontend engineer, pixel-level UI reproduction expert, and prompt engineer.

Task: build a source-grounded 1920x1080 HTML/CSS/limited-JS replica for `能源資料歷史 / Energy Data History`. This is not a redesign, not a similar-style dashboard, and not a generic website. The source file is `11.Energy Data History.png` and the page archetype is `history/chart`.

Technical contract:
- Output one directly executable standalone HTML page.
- Use no React, no CSS framework, no backend, and no external image URLs.
- Use a fixed `.canvas` at 1920px by 1080px, `position: relative`, with contain-fit scaling only.
- Major page blocks must use fixed coordinate placement in page CSS. Do not use internal reflow to move primary regions.
- Runtime HTML must not reference `reference-sources/`.

Coordinate implementation contract:

| Element / selector | left | top | width | height | z-index | Content | CSS visual spec | Component / asset / icon mapping | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-side | 74 | 158 | 242 | 660 | 5 | Filter SettingsCard | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-range-select | 180 | 230 | 120 | 36 | 5 | SelectField | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-source-select | 180 | 294 | 120 | 36 | 5 | SelectField | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-refresh-toggle | 232 | 358 | 48 | 26 | 5 | ToggleSwitch | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .kpi-01 | 348 | 158 | 285 | 128 | 5 | Generation KPI | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .kpi-02 | 654 | 158 | 285 | 128 | 5 | Power KPI | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .kpi-03 | 960 | 158 | 285 | 128 | 5 | Usage KPI | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .kpi-04 | 1266 | 158 | 285 | 128 | 5 | Supply KPI | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .kpi-05 | 1572 | 158 | 285 | 128 | 5 | Carbon KPI | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-chart | 348 | 336 | 1490 | 470 | 5 | ChartCard with ChartPlot | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-chart-legend | 1280 | 365 | 460 | 30 | 5 | Chart legend | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-chart-grid | 386 | 452 | 1414 | 320 | 5 | ChartPlot grid | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-chart-series-solar | 386 | 452 | 1414 | 320 | 5 | ChartPlot solar series | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-chart-series-usage | 386 | 452 | 1414 | 320 | 5 | ChartPlot usage series | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |
| .history-chart-series-grid | 386 | 452 | 1414 | 320 | 5 | ChartPlot external grid series | page-specific absolute region | maps to `styles/pages/11-energy-data-history.css` |

Component DOM signature contract:
- Use `data-component` on real visible components, not decorative wrappers only.
- Bottom navigation uses `BottomNav` with semantic anchor/button targets and active state.
- Chart regions use `ChartCard > chart-card__header + chart-card__plot` with inline SVG `ChartPlot`, axis/grid, labels, and token-colored series.
- Do not fake controls with plain `div`/`span` text when the source shows a real control.

Media purpose contract:
- Every MediaSlot/ImageCard/hero media region must declare `data-media-purpose` and `data-asset-status`.
- Use `data-asset-status="clean"` only for supplied logo/background assets that are actually clean.
- Use `data-asset-status="provisional" data-replace-with="..."` for source-derived crops or weak substitutes, with CSS object-position, crop, mask, or fade treatment.
- Do not use the full source screenshot as runtime media.

Icon tier/detail contract:
- Every icon-bearing visible element must declare icon tier detail in the DOM or adjacent class contract: `DisplayHeroIcon`, `MetricIcon`, or `ControlIcon`.
- Use inline SVG symbols or inline SVG markup so icons render locally.
- Display/metric icons must be source-like visual symbols, not one-path generic toolbar icons.
- Icon color must inherit from CSS tokens/currentColor; no hard-coded black fills/strokes unless the source explicitly shows black.

Forbidden items:
- no redesign or generic dashboard conversion;
- no React conversion in this pass;
- no added source-invisible sections, badges, animation, hover-only UI, or decorative gimmicks;
- no modified logo;
- no emoji/glyph shortcut icons;
- no fake controls;
- no placeholder comments, TODO markers, omitted CSS/SVG, or `此處略`.

Output self-check before final HTML:
- Canvas is exactly 1920x1080.
- All coordinate selectors in the table are represented by HTML classes and page CSS rules.
- Check these source-specific selectors: .topbar, .brand-logo, .brand-name, .system-title, .header-time, .header-date-weather, .header-mqtt-pill, .content-hard-safe-zone, .content-visual-safe-zone, .footer, .footer-slide-indicator, .footer-nav-overview.
- Header, footer, active nav, title hierarchy, primary media/control/card regions, icon tiers, and safe footer gap match the source structure.
- Visible text and numeric/unit hierarchy are preserved as source-like content.
- Media regions have `data-media-purpose` and truthful asset status.
- Component DOM signatures are present for controls/cards/charts/nav.
- No runtime references to original source screenshots.
- The page opens directly in a browser without external network dependencies.

Final output instruction: output only the complete executable HTML. No explanation and no markdown.
