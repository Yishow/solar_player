You are a senior frontend engineer, pixel-level UI reproduction expert, and prompt engineer.

Task: build a source-grounded 1920x1080 HTML/CSS/limited-JS replica for `能源趨勢摘要 / Energy Trend Summary`. This is not a redesign, not a similar-style dashboard, and not a generic website. The source file is `6.Energy Trend Summary.png` and the page archetype is `trend/chart`.

Technical contract:
- Output one directly executable standalone HTML page.
- Use no React, no CSS framework, no backend, and no external image URLs.
- Use a fixed `.canvas` at 1920px by 1080px, `position: relative`, with contain-fit scaling only.
- Major page blocks must use fixed coordinate placement in page CSS. Do not use internal reflow to move primary regions.
- Runtime HTML must not reference `reference-sources/`.

Coordinate implementation contract:

| Element / selector | left | top | width | height | z-index | Content | CSS visual spec | Component / asset / icon mapping | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .trend-eyebrow | 82 | 172 | 360 | 26 | 5 | Trend eyebrow | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .trend-title | 82 | 204 | 670 | 80 | 5 | Trend title | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .trend-copy | 82 | 312 | 560 | 70 | 5 | Trend copy | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .trend-tabs | 1270 | 196 | 520 | 44 | 5 | Range tabs | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .chart-01 | 82 | 384 | 326 | 360 | 5 | ChartCard with ChartPlot | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .chart-02 | 430 | 384 | 326 | 360 | 5 | ChartCard with ChartPlot | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .chart-03 | 778 | 384 | 326 | 360 | 5 | ChartCard with ChartPlot | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .chart-04 | 1126 | 384 | 326 | 360 | 5 | ChartCard with ChartPlot | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .chart-05 | 1474 | 384 | 326 | 360 | 5 | ChartCard with ChartPlot | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |
| .chart-axis-row | 100 | 620 | 1680 | 90 | 5 | Chart grid and axes | page-specific absolute region | maps to `styles/pages/06-energy-trend-summary.css` |

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
