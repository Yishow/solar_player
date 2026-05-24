# Display Asset Generation Guide

This guide supports the formal skill in `skills/display-asset-generation/SKILL.md`.

## Scope

The skill is primarily for the five playback display pages:

- `Overview`
- `Solar`
- `FactoryCircuit`
- `Images`
- `Sustainability`

`SlideshowPreview` is included as a QA surface because it embeds the five playback pages as miniatures. It is not a separate asset target unless a preview-only placeholder or wrapper asset is explicitly needed.

Management pages such as Playback Settings, Image Management, MQTT Settings, Circuit Settings, Device Status, Energy Trend, Energy History, and Offline Error Display are outside this skill by default. They may reuse some assets or principles later, but the generation recipes here are optimized for the five display-wall pages.

## What files are generated?

The skill does not require every asset to be an SVG. Use the file type that matches the asset class.

| Asset | Primary pages | Final format | Why |
| --- | --- | --- | --- |
| Hero photo | Overview, Solar, Sustainability | `.webp` | Large photographic scene; needs compression and stable color. |
| Gallery photo | Images | `.webp` | Large photo set; thumbnails derive from approved source images. |
| KPI icon | Overview, Solar, Sustainability | `.svg` | Must scale cleanly and follow theme color via CSS. |
| Flow node icon | Solar | `.svg` | Must stay crisp in diagram nodes. |
| Circuit node icon | FactoryCircuit | `.svg` | Must preserve topology semantics and scale cleanly. |
| Load row icon | FactoryCircuit | `.svg` | Compact row icon, theme-color friendly. |
| ESG icon | Sustainability | `.svg` | Compact achievement/action icon. |
| Ornament | All display pages | `.svg` or CSS primitive | Leaf, branch, gold line; should be token-driven. |
| Placeholder | Any display page | `.svg` | Quiet fallback glyph/surface. |

`.png` may be used as an intermediate generation or editing format, but it is not the preferred final runtime format.

## Why WebP for photos?

Hero and gallery assets are photographic and large. `.webp` keeps the display wall light enough for runtime playback while preserving visual quality. Use `2400x1350` or `2880x1620` for hero images, and `2400x1350` for gallery images unless a page layout requires otherwise.

## Why SVG for icons and ornaments?

Icons and ornaments must follow the display theme, scale cleanly, and avoid bitmap artifacts. Final production SVG should generally use `currentColor` or CSS variables so page styles control color.

## Approval rule

No asset should be marked approved until it has:

1. A manifest record.
2. A prompt recipe or documented source path.
3. Correct export format.
4. Preview QA notes from the target page.
5. Slideshow preview QA when the asset appears in rotation.

## Related files

- `skills/display-asset-generation/SKILL.md`
- `docs/display-assets/asset-manifest.template.md`
- `docs/display-assets/prompt-recipes/shared-style.md`
- `docs/display-assets/prompt-recipes/display-pages.md`
