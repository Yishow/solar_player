You are a senior frontend engineer, pixel-level UI reproduction expert, and prompt engineer.

Task: build a source-grounded 1920x1080 HTML/CSS/limited-JS replica for `廠區用電迴路 / Factory Circuit`. This is not a redesign, not a similar-style dashboard, and not a generic website. The source file is `3.Factory Circuit.png` and the page archetype is `circuit/diagram`.

Technical contract:
- Output one directly executable standalone HTML page.
- Use no React, no CSS framework, no backend, and no external image URLs.
- Use a fixed `.canvas` at 1920px by 1080px, `position: relative`, with contain-fit scaling only.
- Major page blocks must use fixed coordinate placement in page CSS. Do not use internal reflow to move primary regions.
- Runtime HTML must not reference `reference-sources/`.

Coordinate implementation contract:

| Element / selector | left | top | width | height | z-index | Content | CSS visual spec | Component / asset / icon mapping | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-eyebrow | 82 | 164 | 420 | 26 | 5 | Circuit eyebrow | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-title | 82 | 196 | 520 | 120 | 5 | Circuit title | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-copy | 82 | 355 | 430 | 110 | 5 | Circuit explanation | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-diagram | 670 | 180 | 770 | 430 | 5 | Flow diagram | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-node-source | 670 | 300 | 156 | 156 | 5 | Solar node | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-node-meter | 930 | 300 | 156 | 156 | 5 | Meter node | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-node-battery | 1200 | 218 | 156 | 156 | 5 | Battery node | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-node-factory | 1200 | 425 | 156 | 156 | 5 | Factory node | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-line-main | 810 | 350 | 540 | 170 | 5 | SVG connector lines | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .circuit-load-panel | 1504 | 166 | 330 | 446 | 5 | Load distribution | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .load-row-ac | 1524 | 220 | 290 | 44 | 5 | Load row | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .load-row-production | 1524 | 276 | 290 | 44 | 5 | Load row | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .load-row-admin | 1524 | 332 | 290 | 44 | 5 | Load row | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .load-row-maintenance | 1524 | 388 | 290 | 44 | 5 | Load row | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .load-row-other | 1524 | 444 | 290 | 44 | 5 | Load row | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .kpi-01 | 82 | 752 | 398 | 156 | 5 | Power | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .kpi-02 | 505 | 752 | 398 | 156 | 5 | Supply | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .kpi-03 | 928 | 752 | 398 | 156 | 5 | Generation | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |
| .kpi-04 | 1351 | 752 | 398 | 156 | 5 | Usage | page-specific absolute region | maps to `styles/pages/03-factory-circuit.css` |

Component DOM signature contract:
- Use `data-component` on real visible components, not decorative wrappers only.
- Bottom navigation uses `BottomNav` with semantic anchor/button targets and active state.
- Settings/control regions use `SettingsCard > settings-card__head + settings-card__body`.
- Visible settings rows use `FieldRow > field-row__label + field-row__control`.
- Inputs/selects/toggles/steppers/ranges/buttons use semantic controls or accessible DOM signatures such as `TextInput`, `SelectField`, `ToggleSwitch`, `Stepper`, `RangeSlider`, `ActionButton`, and `DataTable > TableControlCell`.
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
