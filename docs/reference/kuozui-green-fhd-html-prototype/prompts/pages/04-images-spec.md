# Page Spec: 綠能現場影像 / Images

## Part A: Source Visual Analysis

- Source: `4.Images.png`
- Canvas: source is 16:9 and normalized to 1920x1080.
- Archetype: gallery/media
- Page Composition Intent: preserve a kiosk-style solar/energy page with header, bottom nav, warm green paper surface, bilingual hierarchy, and source-specific main content. The page should not become a generic SaaS admin page.
- Media: supplied factory background is used as clean visual material; full source screenshot remains reference-only.
- Controls: visible settings/table controls are represented with semantic DOM signatures when present.


## Part B: 1920x1080 Coordinate Specification

| Element | left | top | width | height | z-index | Content | CSS visual spec | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .images-eyebrow | 82 | 210 | 330 | 26 | 5 | Gallery eyebrow | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .images-title | 82 | 242 | 430 | 110 | 5 | Gallery title | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .images-lead | 82 | 390 | 360 | 110 | 5 | Gallery copy | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .images-main | 548 | 174 | 1110 | 560 | 5 | Main image | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .image-info-card | 1398 | 370 | 342 | 250 | 5 | Caption panel | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .image-info-title | 1426 | 398 | 260 | 30 | 5 | Caption title | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .image-info-counter | 1426 | 500 | 160 | 60 | 5 | 03/08 counter | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .thumb-1 | 638 | 764 | 234 | 116 | 5 | Thumbnail 1 | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .thumb-2 | 894 | 764 | 234 | 116 | 5 | Thumbnail 2 | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .thumb-3 | 1150 | 764 | 234 | 116 | 5 | Thumbnail 3 | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .thumb-4 | 1406 | 764 | 234 | 116 | 5 | Thumbnail 4 | page-specific absolute region | maps to `styles/pages/04-images.css` |

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

Task: build a source-grounded 1920x1080 HTML/CSS/limited-JS replica for `綠能現場影像 / Images`. This is not a redesign, not a similar-style dashboard, and not a generic website. The source file is `4.Images.png` and the page archetype is `gallery/media`.

Technical contract:
- Output one directly executable standalone HTML page.
- Use no React, no CSS framework, no backend, and no external image URLs.
- Use a fixed `.canvas` at 1920px by 1080px, `position: relative`, with contain-fit scaling only.
- Major page blocks must use fixed coordinate placement in page CSS. Do not use internal reflow to move primary regions.
- Runtime HTML must not reference `reference-sources/`.

Coordinate implementation contract:

| Element / selector | left | top | width | height | z-index | Content | CSS visual spec | Component / asset / icon mapping | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .images-eyebrow | 82 | 210 | 330 | 26 | 5 | Gallery eyebrow | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .images-title | 82 | 242 | 430 | 110 | 5 | Gallery title | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .images-lead | 82 | 390 | 360 | 110 | 5 | Gallery copy | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .images-main | 548 | 174 | 1110 | 560 | 5 | Main image | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .image-info-card | 1398 | 370 | 342 | 250 | 5 | Caption panel | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .image-info-title | 1426 | 398 | 260 | 30 | 5 | Caption title | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .image-info-counter | 1426 | 500 | 160 | 60 | 5 | 03/08 counter | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .thumb-1 | 638 | 764 | 234 | 116 | 5 | Thumbnail 1 | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .thumb-2 | 894 | 764 | 234 | 116 | 5 | Thumbnail 2 | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .thumb-3 | 1150 | 764 | 234 | 116 | 5 | Thumbnail 3 | page-specific absolute region | maps to `styles/pages/04-images.css` |
| .thumb-4 | 1406 | 764 | 234 | 116 | 5 | Thumbnail 4 | page-specific absolute region | maps to `styles/pages/04-images.css` |

Component DOM signature contract:
- Use `data-component` on real visible components, not decorative wrappers only.
- Bottom navigation uses `BottomNav` with semantic anchor/button targets and active state.
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

## Shared Component Reference
Page-specific coordinate table rows above remain source-visible only; shared component reference rules are documented here to keep control/table signatures separate from Part B coordinates.