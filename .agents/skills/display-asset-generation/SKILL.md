---
name: display-asset-generation
description: Use this skill when planning, generating, exporting, reviewing, or wiring visual assets for the five solar_player playback display pages: Overview, Solar, FactoryCircuit, Images, and Sustainability. This covers hero photos, gallery photos, KPI icons, flow/circuit icons, load icons, ESG icons, ornaments, placeholders, asset manifests, prompt recipes, export specs, and preview QA.
---

# Display Asset Generation Skill

This skill defines a repeatable workflow for generating and governing visual assets used by the five playback display pages.

It is not a general marketing-image skill. It is primarily for the display wall runtime pages:

- `Overview`
- `Solar`
- `FactoryCircuit`
- `Images`
- `Sustainability`

`/slideshow-preview` is included only as a QA surface because it embeds those pages as miniatures.

## Output formats

Use different file types for different asset classes:

| Asset class | Preferred production output | Notes |
| --- | --- | --- |
| Hero photo | `.webp` | Usually `2400x1350` or `2880x1620`. |
| Gallery photo | `.webp` | Usually `2400x1350`; thumbnail derivatives come from the approved source. |
| KPI icon | `.svg` | Usually `viewBox 0 0 96 96`; use `currentColor` when possible. |
| Flow node icon | `.svg` | Usually `viewBox 0 0 128 128`; used by Solar flow nodes. |
| Circuit node icon | `.svg` | Usually `viewBox 0 0 128 128`; used by FactoryCircuit topology nodes. |
| Load row icon | `.svg` | Usually `viewBox 0 0 96 96`; used by FactoryCircuit load rows. |
| ESG icon | `.svg` | Usually `viewBox 0 0 96 96`; used by Sustainability cards/lists. |
| Ornament | `.svg` or CSS primitive | Leaf watermark, gold line, branch accents; token-driven color/opacity. |
| Placeholder | `.svg` | Quiet fallback surface/glyph for missing asset states. |

Use `.png` only as an intermediate source or when a tool requires it during editing. Do not treat `.png` as the preferred final runtime format unless there is a specific reason.

## Core rule

A production asset must move through this chain:

```text
Asset intent
→ Manifest record
→ Prompt recipe
→ Candidate generation or curation
→ Post-process / SVG normalization
→ Runtime or preview placement
→ Preview QA
→ Approved or revised
```

If any step is missing, keep the asset as `draft` or `candidate`, not `approved`.

## Required manifest fields

Every approved asset should have:

- `page`: `overview`, `solar`, `factory-circuit`, `images`, `sustainability`, or `shared`.
- `slot`: `heroMedia`, `gallery`, `kpiIcon`, `flowNodeIcon`, `circuitNodeIcon`, `loadIcon`, `ornament`, or `placeholder`.
- `assetKey`: stable kebab-case key.
- `role`: `photo`, `icon`, `ornament`, or `placeholder`.
- `format`: usually `webp` for photos and `svg` for icons/ornaments/placeholders.
- `targetSize`: for example `2400x1350`, `2880x1620`, `viewBox 0 0 96 96`, or `viewBox 0 0 128 128`.
- `sourceMode`: `seed-default`, `managed-asset`, or `direct-src`.
- `promptRecipe`: recipe id used to generate or prepare the asset.
- `version`: start at `v001`.
- `status`: `draft`, `candidate`, `approved`, or `deprecated`.
- `qaNotes`: required before `approved`.

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

Avoid informal names such as `final.png`, `new-new.png`, `漂亮圖.png`, or `最後版2.webp`.

## Shared visual style

Use this shared display-wall style for all generated or curated assets:

- Warm ivory paper surface.
- Corporate green-energy display wall.
- Clean factory sustainability context.
- Soft natural light.
- Low saturation.
- Deep green primary accents.
- Misty green secondary accents.
- Subtle solar gold highlights.
- Quiet botanical ornament language.
- High readability from display-wall distance.
- Premium enterprise presentation.

Avoid generated text, UI screenshots, fake marks, unreadable signs, chart labels, close-up identity details, watermarks, oversaturated colors, heavy bokeh, excessive 3D rendering, and random decorative glow spots.

## Page asset map

### Overview

Generate or curate:

- Hero photo: factory or green-energy site photo, final `.webp`.
- KPI icons: real-time power, today generation, total generation, today CO2 reduction, total CO2 reduction, final `.svg`.
- Ornaments: leaf watermark and gold line, final `.svg` or CSS primitive.

QA focus: hero image must blend with left-side copy and warm fade without reducing KPI readability.

### Solar

Generate or curate:

- Hero photo: solar carport or solar panel field, final `.webp`.
- Flow icons: solar panel, inverter, factory consumption, CO2 reduction, final `.svg`.
- KPI icons: generation, self-consumption, CO2 today, CO2 total, efficiency, final `.svg`.

QA focus: flow node icons and KPI icons must share one icon grammar.

### FactoryCircuit

Generate or curate:

- Circuit node icons: source, inverter, switchboard, equipment/load, endpoints, final `.svg`.
- Load row icons: equipment, lighting, HVAC, production, final `.svg`.
- Optional endpoint/ornament assets, final `.svg` or CSS primitive.

Routing lines should remain React/SVG/CSS-rendered, not bitmap images.

QA focus: asset polish must not weaken electrical topology or status meaning.

### Images

Generate or curate:

- Gallery photos, final `.webp`.
- Placeholder, final `.svg`.
- Info/location icon, final `.svg`.
- Arrow icons only if not supplied by the runtime icon library, final `.svg`.

QA focus: gallery set must share crop, color grading, and thumbnail readability.

### Sustainability

Generate or curate:

- Hero photo: green factory or ESG achievement scene, final `.webp`.
- KPI/ESG icons: energy, CO2, tree, renewable energy, efficiency, supply chain, final `.svg`.
- Optional achievement ornaments, final `.svg` or CSS primitive.

QA focus: achievement and brand tone, not real-time monitoring tone.

## Photo workflow

1. Draft the manifest record.
2. Select the shared style and page recipe.
3. Generate or curate 4-8 candidates.
4. Reject candidates with baked-in text, brand-like marks, fake signage, distorted industrial details, overly dark lighting, or inconsistent color tone.
5. Select 1-2 candidates for post-processing.
6. Crop to the target ratio.
7. Normalize color temperature, saturation, midtone brightness, and sharpness.
8. Export as `.webp`.
9. Place in the target page route or managed asset slot.
10. Run preview QA before approval.

## Icon workflow

AI-generated icon imagery is only a concept reference. Production icons must be normalized SVG.

1. Draft the manifest record.
2. Select the page and icon recipe.
3. Generate/sketch concept candidates if useful.
4. Select the clearest semantic direction.
5. Rebuild or trace as SVG.
6. Normalize viewBox and stroke width.
7. Use `currentColor` where possible.
8. Test in the target card, flow node, circuit node, or row.
9. Review the whole icon set together.
10. Update manifest status and QA notes.

Final SVG should avoid embedded bitmaps, page-specific hardcoded colors, heavy filters, shadows, gradients, and inconsistent detail density.

## Ornament workflow

Use for leaf watermarks, gold lines, branch accents, and quiet placeholders.

1. Identify the ornament role and page slot.
2. Choose display semantic token colors and opacity range.
3. Sketch as SVG path or CSS primitive.
4. Test behind hero title, KPI cards, routing diagrams, and gallery stage.
5. Reduce opacity/detail until the ornament supports content instead of competing with it.
6. Record manifest entry and QA notes.

Ornaments should usually be SVG or CSS primitives, not bitmap images.

## Prompt recipe structure

Each recipe should include:

1. Shared style.
2. Page intent.
3. Asset role.
4. Composition.
5. Constraints.
6. Avoid list.
7. Output specification.

Example recipe id pattern:

```text
{page}.{asset-role}.v1
```

Examples:

- `overview.hero-photo.v1`
- `solar.flow-icon.v1`
- `factory-circuit.node-icon.v1`
- `images.gallery-photo.v1`
- `sustainability.esg-icon.v1`

## Preview QA

Before marking an asset as `approved`, check the relevant route and slideshow preview when applicable:

- `/overview`
- `/solar`
- `/factory-circuit`
- `/images`
- `/sustainability`
- `/slideshow-preview`

Check:

- Page topic is understandable within three seconds.
- The asset supports the page story rather than becoming accidental clutter.
- Text and metric readability remain strong.
- No important visual detail sits behind title, KPI cards, route lines, or charts.
- The asset matches the warm paper / green-energy display family.
- The asset still works as a small slideshow preview card.
- Icons in a set share line weight, detail density, optical size, and color behavior.
- Ornaments remain quiet and token-compatible.

Use this QA note template:

```text
QA route(s):
Slot:
Asset key/version:
Readability:
Fade/crop:
Icon/ornament consistency:
Slideshow preview:
Decision: approved | revise | deprecated
Notes:
```

## Response style when using this skill

When asked to generate or plan assets:

1. Start with asset manifest rows.
2. Then provide the prompt recipe or recipe id.
3. Then provide export and QA steps.
4. Do not mark an asset approved unless QA evidence exists.
5. If asked for immediate visual generation, state the manifest assumptions first, then generate candidates.
