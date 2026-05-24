# Display Asset Generation Skills

This folder defines the repeatable asset-generation workflow for the five playback display pages:

- Overview
- Solar
- FactoryCircuit
- Images
- Sustainability

The goal is stable production-grade display assets, not one-off good-looking images. Every asset should move through this pipeline:

```text
Asset intent
→ Manifest record
→ Prompt recipe
→ Candidate generation
→ Post-process/export
→ Runtime/preview placement
→ Preview QA
→ Approved or revised
```

## Asset classes

| Class | Preferred output | Used by | Rule |
| --- | --- | --- | --- |
| Hero photo | `.webp`, 2400×1350 or 2880×1620 | Overview, Solar, Sustainability | No baked-in text, logos, fake UI, people details, or signage artifacts. |
| Gallery photo | `.webp`, 2400×1350 | Images | Same color temperature and visual tone across the set. |
| KPI icon | `.svg`, 96×96 | Overview, Solar, Sustainability | Final SVG must use stable viewBox, shared stroke rhythm, and `currentColor`. |
| Flow/circuit icon | `.svg`, 128×128 | Solar, FactoryCircuit | Must preserve node semantics and distance readability. |
| Ornament | SVG or CSS primitive | All display pages | Decorative only; token-driven color/opacity; never compete with content. |
| Placeholder | `.svg` | Any page with missing asset state | Readable fallback, visually quiet, not a production image substitute. |

## Required manifest fields

Before an asset can be approved, it needs a manifest record with:

- `page`
- `slot`
- `assetKey`
- `role`
- `format`
- `targetSize`
- `sourceMode`
- `promptRecipe`
- `version`
- `status`
- `qaNotes`

See `asset-manifest.template.md`.

## Page asset map

### Overview

- Hero photo: factory / green-energy site photo
- KPI icons: power, today generation, total generation, CO2 today, CO2 total
- Ornaments: leaf watermark, gold line

### Solar

- Hero photo: solar carport / solar panel field
- Flow icons: solar panel, inverter, factory consumption, CO2 reduction
- KPI icons: generation, self-consumption, CO2 today, CO2 total, efficiency

### FactoryCircuit

- Circuit node icons: solar/source, inverter, switchboard, equipment/load
- Load icons: equipment, lighting, HVAC, production
- Routing line: render via React/SVG/CSS, not bitmap assets

### Images

- Gallery photos
- Placeholder
- Info/location icon
- Arrow icons if not using lucide/runtime icons

### Sustainability

- Hero photo: green factory / ESG achievement scene
- KPI/ESG icons: energy, CO2, tree, renewable, efficiency, supply chain

## Naming convention

Use predictable versioned paths:

```text
public/display-assets/{page}/{role}/{asset-key}@v001.webp
public/display-assets/{page}/{role}/{asset-key}@v001.svg
```

Examples:

```text
public/display-assets/solar/hero/solar-carport@v001.webp
public/display-assets/solar/icons/solar-flow-panel@v001.svg
public/display-assets/sustainability/icons/esg-renewable@v001.svg
```

Avoid informal file names such as `final.png`, `new-new.png`, `漂亮圖.png`, or `最後版2.webp`.

## QA principle

Do not approve assets by viewing files alone. Review them in the actual playback surfaces:

- `/overview`
- `/solar`
- `/factory-circuit`
- `/images`
- `/sustainability`
- `/slideshow-preview`

Approval means the asset works inside the display wall, not merely that it looks good by itself.
