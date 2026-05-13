You are a senior frontend engineer, pixel-level UI reproduction expert, and prompt engineer.

Task: build a source-grounded 1920x1080 HTML/CSS/limited-JS replica for `播放設定 / Playback Settings`. This is not a redesign, not a similar-style dashboard, and not a generic website. The source file is `13.Slideshow Preview.png` and the page archetype is `settings/control`.

Technical contract:
- Output one directly executable standalone HTML page.
- Use no React, no CSS framework, no backend, and no external image URLs.
- Use a fixed `.canvas` at 1920px by 1080px, `position: relative`, with contain-fit scaling only.
- Major page blocks must use fixed coordinate placement in page CSS. Do not use internal reflow to move primary regions.
- Runtime HTML must not reference `reference-sources/`.

Coordinate implementation contract:

| Element / selector | left | top | width | height | z-index | Content | CSS visual spec | Component / asset / icon mapping | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .slideshow-eyebrow | 82 | 160 | 320 | 26 | 5 | Settings eyebrow | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .slideshow-title | 82 | 192 | 470 | 76 | 5 | Settings title | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .slideshow-strip | 635 | 160 | 1040 | 134 | 5 | Preview thumbnails | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .mini-slide-01 | 635 | 160 | 184 | 126 | 5 | Preview thumbnail | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .mini-slide-02 | 837 | 160 | 184 | 126 | 5 | Preview thumbnail | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .mini-slide-03 | 1039 | 160 | 184 | 126 | 5 | Preview thumbnail | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .mini-slide-04 | 1241 | 160 | 184 | 126 | 5 | Preview thumbnail | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .mini-slide-05 | 1443 | 160 | 184 | 126 | 5 | Preview thumbnail | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .slide-setting-page-sequence | 82 | 362 | 400 | 408 | 5 | SettingsCard with ToggleSwitch controls | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .slide-setting-duration | 505 | 362 | 400 | 408 | 5 | SettingsCard with Stepper controls | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .slide-setting-screen | 928 | 362 | 400 | 408 | 5 | SettingsCard with RangeSlider SelectField ToggleSwitch | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .slide-setting-weather | 1351 | 362 | 400 | 408 | 5 | SettingsCard with ToggleSwitch Stepper SelectField | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .playback-page-toggle-overview | 380 | 430 | 48 | 26 | 5 | ToggleSwitch | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .playback-duration-stepper | 735 | 430 | 118 | 36 | 5 | Stepper | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .playback-brightness-range | 1110 | 430 | 170 | 36 | 5 | RangeSlider | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |
| .playback-language-select | 1510 | 558 | 180 | 36 | 5 | SelectField | page-specific absolute region | maps to `styles/pages/07-playback-settings.css` |

Component DOM signature contract:
- Use `data-component` on real visible components, not decorative wrappers only.
- Bottom navigation uses `BottomNav` with semantic anchor/button targets and active state.
- Settings/control regions use `SettingsCard > settings-card__head + settings-card__body`.
- Visible settings rows use `FieldRow > field-row__label + field-row__control`.
- Inputs/selects/toggles/steppers/ranges/buttons use semantic controls or accessible DOM signatures such as `TextInput`, `SelectField`, `ToggleSwitch`, `Stepper`, `RangeSlider`, `ActionButton`, and `DataTable > TableControlCell`.
- Image/slideshow regions use `ImageCard`, `MediaSlot`, thumbnail controls, and action buttons with source-like density.
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
