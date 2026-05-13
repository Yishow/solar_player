# Page Spec: 資料來源 MQTT 設定 / Data Source & MQTT Settings

## Part A: Source Visual Analysis

- Source: `9.MQTT Settings.png`
- Canvas: source is 16:9 and normalized to 1920x1080.
- Archetype: settings/control
- Page Composition Intent: preserve a kiosk-style solar/energy page with header, bottom nav, warm green paper surface, bilingual hierarchy, and source-specific main content. The page should not become a generic SaaS admin page.
- Media: supplied factory background is used as clean visual material; full source screenshot remains reference-only.
- Controls: visible settings/table controls are represented with semantic DOM signatures when present.
- Page density class: `page-density-admin`, `page-density-table`, or `page-density-device` as implemented in the page HTML.
- Component/control mapping: TextInput, SelectField, ToggleSwitch, Stepper, RangeSlider, TableControlCell, ActionButton, DataTable, SettingsCard, FieldRow.


## Part B: 1920x1080 Coordinate Specification

| Element | left | top | width | height | z-index | Content | CSS visual spec | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-eyebrow | 82 | 160 | 360 | 26 | 5 | MQTT eyebrow | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-title | 82 | 192 | 560 | 76 | 5 | MQTT title | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-card-source | 82 | 340 | 430 | 430 | 5 | SettingsCard | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-source-select | 300 | 408 | 150 | 36 | 5 | SelectField | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-reconnect-toggle | 398 | 470 | 48 | 26 | 5 | ToggleSwitch | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-refresh-stepper | 334 | 532 | 118 | 36 | 5 | Stepper | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-card-broker | 536 | 340 | 430 | 430 | 5 | SettingsCard | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-host-textinput | 718 | 408 | 190 | 36 | 5 | TextInput | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-port-stepper | 778 | 470 | 118 | 36 | 5 | Stepper | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-tls-toggle | 852 | 532 | 48 | 26 | 5 | ToggleSwitch | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-card-topics | 990 | 340 | 470 | 430 | 5 | SettingsCard | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-summary-topic-textinput | 1204 | 408 | 206 | 36 | 5 | TextInput | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-zone-topic-textinput | 1204 | 470 | 206 | 36 | 5 | TextInput | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-qos-select | 1270 | 532 | 98 | 36 | 5 | SelectField | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live | 1552 | 340 | 286 | 430 | 5 | Live values | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-power | 1570 | 394 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-generation | 1570 | 450 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-usage | 1570 | 506 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-carbon | 1570 | 562 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-total | 1570 | 618 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |

## Part C: Restoration Strategy

Major regions are absolutely positioned in page CSS. Repeated card internals use component CSS. Charts are static SVG prototypes. Media slots declare semantic media purpose and status.

## Part D: Forbidden Items

- no redesign or generic dashboard conversion
- no React conversion in this pass
- no runtime references to `reference-sources/`
- no modified logo
- no emoji/glyph shortcut icons
- no fake controls for visible settings

## Part E: Final HTML Generation Prompt


You are a senior frontend engineer, pixel-level UI reproduction expert, and prompt engineer.

Task: build a source-grounded 1920x1080 HTML/CSS/limited-JS replica for `資料來源 MQTT 設定 / Data Source & MQTT Settings`. This is not a redesign, not a similar-style dashboard, and not a generic website. The source file is `9.MQTT Settings.png` and the page archetype is `settings/control`.

Technical contract:
- Output one directly executable standalone HTML page.
- Use no React, no CSS framework, no backend, and no external image URLs.
- Use a fixed `.canvas` at 1920px by 1080px, `position: relative`, with contain-fit scaling only.
- Major page blocks must use fixed coordinate placement in page CSS. Do not use internal reflow to move primary regions.
- Runtime HTML must not reference `reference-sources/`.

Coordinate implementation contract:

| Element / selector | left | top | width | height | z-index | Content | CSS visual spec | Component / asset / icon mapping | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-eyebrow | 82 | 160 | 360 | 26 | 5 | MQTT eyebrow | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-title | 82 | 192 | 560 | 76 | 5 | MQTT title | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-card-source | 82 | 340 | 430 | 430 | 5 | SettingsCard | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-source-select | 300 | 408 | 150 | 36 | 5 | SelectField | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-reconnect-toggle | 398 | 470 | 48 | 26 | 5 | ToggleSwitch | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-refresh-stepper | 334 | 532 | 118 | 36 | 5 | Stepper | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-card-broker | 536 | 340 | 430 | 430 | 5 | SettingsCard | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-host-textinput | 718 | 408 | 190 | 36 | 5 | TextInput | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-port-stepper | 778 | 470 | 118 | 36 | 5 | Stepper | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-tls-toggle | 852 | 532 | 48 | 26 | 5 | ToggleSwitch | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-card-topics | 990 | 340 | 470 | 430 | 5 | SettingsCard | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-summary-topic-textinput | 1204 | 408 | 206 | 36 | 5 | TextInput | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-zone-topic-textinput | 1204 | 470 | 206 | 36 | 5 | TextInput | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-qos-select | 1270 | 532 | 98 | 36 | 5 | SelectField | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live | 1552 | 340 | 286 | 430 | 5 | Live values | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-power | 1570 | 394 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-generation | 1570 | 450 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-usage | 1570 | 506 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-carbon | 1570 | 562 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |
| .mqtt-live-total | 1570 | 618 | 250 | 44 | 5 | Status row | page-specific absolute region | maps to `styles/pages/09-mqtt-settings.css` |

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

## Shared Component Reference
Page-specific coordinate table rows above remain source-visible only; shared component reference rules are documented here to keep control/table signatures separate from Part B coordinates.