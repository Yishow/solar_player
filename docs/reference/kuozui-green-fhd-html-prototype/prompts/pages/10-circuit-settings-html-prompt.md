You are a senior frontend engineer, pixel-level UI reproduction expert, and prompt engineer.

Task: build a source-grounded 1920x1080 HTML/CSS/limited-JS replica for `用電迴路設定 / Circuit Settings`. This is not a redesign, not a similar-style dashboard, and not a generic website. The source file is `10.Circuit Settings.png` and the page archetype is `table/admin`.

Technical contract:
- Output one directly executable standalone HTML page.
- Use no React, no CSS framework, no backend, and no external image URLs.
- Use a fixed `.canvas` at 1920px by 1080px, `position: relative`, with contain-fit scaling only.
- Major page blocks must use fixed coordinate placement in page CSS. Do not use internal reflow to move primary regions.
- Runtime HTML must not reference `reference-sources/`.

Coordinate implementation contract:

| Element / selector | left | top | width | height | z-index | Content | CSS visual spec | Component / asset / icon mapping | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-settings-eyebrow | 82 | 160 | 330 | 26 | 5 | Table eyebrow | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-settings-title | 82 | 192 | 520 | 76 | 5 | Table title | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .table-toolbar | 1360 | 168 | 400 | 40 | 5 | ActionButton toolbar | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-table | 82 | 288 | 1756 | 560 | 5 | DataTable | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .table-header-index | 100 | 300 | 50 | 42 | 5 | DataTable header | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .table-header-name | 160 | 300 | 220 | 42 | 5 | DataTable header | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .table-header-zone | 390 | 300 | 180 | 42 | 5 | DataTable header | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .table-header-meter | 580 | 300 | 160 | 42 | 5 | DataTable header | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .table-header-topic | 750 | 300 | 360 | 42 | 5 | DataTable header | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .table-header-threshold | 1120 | 300 | 160 | 42 | 5 | DataTable header | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .table-header-status | 1300 | 300 | 130 | 42 | 5 | DataTable header | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-row-01 | 82 | 342 | 1756 | 58 | 5 | DataTable row with TableControlCell SelectField Stepper ToggleSwitch | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-row-02 | 82 | 400 | 1756 | 58 | 5 | DataTable row with controls | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-row-03 | 82 | 458 | 1756 | 58 | 5 | DataTable row with controls | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-row-04 | 82 | 516 | 1756 | 58 | 5 | DataTable row with controls | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-row-05 | 82 | 574 | 1756 | 58 | 5 | DataTable row with controls | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-row-06 | 82 | 632 | 1756 | 58 | 5 | DataTable row with controls | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |
| .circuit-row-07 | 82 | 690 | 1756 | 58 | 5 | DataTable row with controls | page-specific absolute region | maps to `styles/pages/10-circuit-settings.css` |

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
