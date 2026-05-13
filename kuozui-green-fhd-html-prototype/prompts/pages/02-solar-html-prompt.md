You are a senior frontend engineer, pixel-level UI reproduction expert, and prompt engineer.

Task: build a source-grounded 1920x1080 HTML/CSS/limited-JS replica for `太陽能驅動製造新能源 / Solar`. This is not a redesign, not a similar-style dashboard, and not a generic website. The source file is `2.Solar.png` and the page archetype is `energy-flow`.

Technical contract:
- Output one directly executable standalone HTML page.
- Use no React, no CSS framework, no backend, and no external image URLs.
- Use a fixed `.canvas` at 1920px by 1080px, `position: relative`, with contain-fit scaling only.
- Major page blocks must use fixed coordinate placement in page CSS. Do not use internal reflow to move primary regions.
- Runtime HTML must not reference `reference-sources/`.

Coordinate implementation contract:

| Element / selector | left | top | width | height | z-index | Content | CSS visual spec | Component / asset / icon mapping | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .solar-eyebrow | 80 | 162 | 320 | 26 | 5 | Solar eyebrow | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .solar-title | 80 | 194 | 510 | 150 | 5 | Hero | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .solar-lead | 80 | 390 | 430 | 110 | 5 | Solar copy | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .solar-photo | 82 | 526 | 820 | 284 | 5 | Solar media | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .flow-solar | 775 | 208 | 156 | 156 | 5 | Solar node | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .flow-battery | 1080 | 208 | 156 | 156 | 5 | Battery node | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .flow-factory | 1385 | 208 | 156 | 156 | 5 | Factory node | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .flow-carbon | 1385 | 441 | 156 | 156 | 5 | CO2 node | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .connector-solar-battery | 930 | 294 | 150 | 2 | 5 | Flow connector | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .connector-battery-factory | 1235 | 294 | 150 | 2 | 5 | Flow connector | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .connector-factory-carbon | 1463 | 364 | 2 | 78 | 5 | Flow connector | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .kpi-01 | 82 | 812 | 326 | 156 | 5 | Generation | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .kpi-02 | 430 | 812 | 326 | 156 | 5 | Supply ratio | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .kpi-03 | 778 | 812 | 326 | 156 | 5 | CO2 | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .kpi-04 | 1126 | 812 | 326 | 156 | 5 | Total generation | page-specific absolute region | maps to `styles/pages/02-solar.css` |
| .kpi-05 | 1474 | 812 | 326 | 156 | 5 | System efficiency | page-specific absolute region | maps to `styles/pages/02-solar.css` |

Component DOM signature contract:
- Use `data-component` on real visible components, not decorative wrappers only.
- Bottom navigation uses `BottomNav` with semantic anchor/button targets and active state.
- Display pages use `KpiCard`, `MediaSlot`, `StatusPill`, and source-like hero/metric groups.
- KPI and hero regions must keep their visual hierarchy and cannot be replaced by admin controls or table widgets.
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

<!-- PAGE-ASSET-BINDER:START -->
Asset binding contract:
- Runtime assets for this page must use `../../assets/generated/02-solar`.
- Use only asset ids declared in `../../page-artifacts/02-solar/asset-manifest.json`.
- Do not reference raw material filenames from page-scoped material folders.
- Preserve existing bound asset ids unless the manifest explicitly changes them.
- `solar-carport-hero`: `../../assets/generated/02-solar/solar-carport-hero.png` for `solar-carport`.
- `solar-panel-display-source`: `../../assets/generated/02-solar/solar-panel-display-source.png` for `solar-panel-display`.
- `inverter-display-source`: `../../assets/generated/02-solar/inverter-display-source.png` for `inverter-display`.
- `factory-consumption-display-source`: `../../assets/generated/02-solar/factory-consumption-display-source.png` for `factory-consumption-display`.
- `carbon-reduction-display-source`: `../../assets/generated/02-solar/carbon-reduction-display-source.png` for `carbon-reduction-display`.
- `metric-generation-sun-source`: `../../assets/generated/02-solar/metric-generation-sun-source.png` for `metric-generation-sun`.
- `metric-self-consumption-source`: `../../assets/generated/02-solar/metric-self-consumption-source.png` for `metric-self-consumption`.
- `carbon-reduction-display-source`: `../../assets/generated/02-solar/carbon-reduction-display-source.png` for `metric-co2-today`.
- `metric-co2-total-source`: `../../assets/generated/02-solar/metric-co2-total-source.png` for `metric-co2-total`.
- `metric-efficiency-source`: `../../assets/generated/02-solar/metric-efficiency-source.png` for `metric-efficiency`.
<!-- PAGE-ASSET-BINDER:END -->
