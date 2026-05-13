You are a senior frontend engineer, pixel-level UI reproduction expert, and prompt engineer.

Task: build a source-grounded 1920x1080 HTML/CSS/limited-JS replica for `循環播放預覽 / Slideshow Preview`. This is not a redesign, not a similar-style dashboard, and not a generic website. The source file is `7.Playback Settings.png` and the page archetype is `playlist/preview`.

Technical contract:
- Output one directly executable standalone HTML page.
- Use no React, no CSS framework, no backend, and no external image URLs.
- Use a fixed `.canvas` at 1920px by 1080px, `position: relative`, with contain-fit scaling only.
- Major page blocks must use fixed coordinate placement in page CSS. Do not use internal reflow to move primary regions.
- Runtime HTML must not reference `reference-sources/`.

Coordinate implementation contract:

| Element / selector | left | top | width | height | z-index | Content | CSS visual spec | Component / asset / icon mapping | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| .topbar | 42 | 26 | 1836 | 72 | 5 | Kiosk header with logo/time/status | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .brand-logo | 42 | 38 | 46 | 46 | 5 | Supplied logo in white holder | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .brand-name | 102 | 38 | 190 | 42 | 5 | Brand Chinese and English | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .system-title | 372 | 38 | 420 | 42 | 5 | System bilingual title | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .header-time | 1240 | 32 | 88 | 42 | 5 | Clock display | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .header-date-weather | 1346 | 42 | 220 | 24 | 5 | Date and weather | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .header-mqtt-pill | 1635 | 38 | 140 | 36 | 5 | MQTT status pill | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .content-hard-safe-zone | 0 | 126 | 1920 | 838 | 5 | Main content area above footer | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .content-visual-safe-zone | 0 | 126 | 1920 | 818 | 5 | Visual safe zone above footer gap | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .footer | 42 | 984 | 1836 | 72 | 5 | Bottom navigation | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .footer-slide-indicator | 42 | 1008 | 46 | 24 | 5 | Page number pill | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .footer-nav-overview | 600 | 1000 | 90 | 38 | 5 | Overview navigation link | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .footer-nav-solar | 732 | 1000 | 70 | 38 | 5 | Solar navigation link | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .footer-nav-circuit | 840 | 1000 | 130 | 38 | 5 | Factory Circuit navigation link | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .footer-nav-image | 1010 | 1000 | 70 | 38 | 5 | Image navigation link | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .footer-nav-sustainability | 1120 | 1000 | 130 | 38 | 5 | Sustainability navigation link | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .footer-nav-settings | 1292 | 1000 | 90 | 38 | 5 | Settings navigation link | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .footer-note | 1600 | 1008 | 278 | 24 | 5 | Footer operational note | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .preview-eyebrow | 82 | 164 | 330 | 26 | 5 | Preview eyebrow | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .preview-title | 82 | 196 | 420 | 80 | 5 | Preview title | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .playlist-side | 82 | 356 | 260 | 430 | 5 | Playlist | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .playlist-row-01 | 100 | 408 | 224 | 44 | 5 | Playlist row | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .playlist-row-02 | 100 | 462 | 224 | 44 | 5 | Playlist row | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .playlist-row-03 | 100 | 516 | 224 | 44 | 5 | Playlist row active | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .playlist-row-04 | 100 | 570 | 224 | 44 | 5 | Playlist row | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .playlist-row-05 | 100 | 624 | 224 | 44 | 5 | Playlist row | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .slide-1 | 430 | 254 | 250 | 350 | 5 | Slide card | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .slide-2 | 680 | 254 | 250 | 350 | 5 | Slide card | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .slide-3 | 945 | 254 | 250 | 420 | 5 | Active slide card | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .slide-4 | 1224 | 254 | 250 | 350 | 5 | Slide card | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .slide-5 | 1478 | 254 | 250 | 350 | 5 | Slide card | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .kpi-01 | 430 | 780 | 398 | 156 | 5 | Interval | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .kpi-02 | 853 | 780 | 398 | 156 | 5 | Pages | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .kpi-03 | 1276 | 780 | 398 | 156 | 5 | Cycle | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |
| .kpi-04 | 82 | 780 | 398 | 156 | 5 | Data status | page-specific absolute region | maps to `styles/pages/13-slideshow-preview.css` |

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
