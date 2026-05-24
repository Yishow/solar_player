---
name: display-asset-generation
description: Use this skill when planning, generating, exporting, reviewing, or wiring assets for the solar_player display wall pages, including Overview, Solar, FactoryCircuit, Images, and Sustainability hero photos, gallery photos, KPI icons, flow/circuit icons, ornaments, asset manifests, prompt recipes, and preview QA.
---

# Display Asset Generation Skill

This skill turns display-wall asset work into a repeatable production workflow. Do not start with a one-off image prompt. Start with intent, manifest, recipe, export target, and preview QA.

## When to use this skill

Use this skill for any request involving:

- Display playback page assets for `Overview`, `Solar`, `FactoryCircuit`, `Images`, or `Sustainability`.
- Hero photos, gallery photos, KPI icons, flow node icons, circuit node icons, load icons, ESG icons, placeholders, leaf watermarks, gold lines, or branch ornaments.
- Asset manifest records, asset naming, versioning, prompt recipes, export specifications, post-processing, or preview QA.
- Connecting generated assets to seed defaults, managed assets, direct source fallback, or runtime preview surfaces.

Do not use this skill for unrelated UI component design, backend APIs, generic image editing, or general marketing images outside the display wall.

## Operating principle

A production display asset must pass through this chain:

```text
Asset intent
→ Manifest record
→ Prompt recipe
→ Candidate generation
→ Post-process / SVG normalization
→ Runtime or preview placement
→ Preview QA
→ Approved or revised
```

If a step is missing, keep the asset status as `draft` or `candidate`, not `approved`.

## Required manifest fields

Before approving an asset, record:

- `page`: `overview`, `solar`, `factory-circuit`, `images`, `sustainability`, or `shared`.
- `slot`: `heroMedia`, `gallery`, `kpiIcon`, `flowNodeIcon`, `circuitNodeIcon`, `loadIcon`, `ornament`, or `placeholder`.
- `assetKey`: stable kebab-case key.
- `role`: `photo`, `icon`, `ornament`, or `placeholder`.
- `format`: usually `webp` for photos and `svg` for icons/ornaments.
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

Avoid informal names like `final.png`, `new-new.png`, `漂亮圖.png`, or `最後版2.webp`.

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

- Hero photo: factory or green-energy site photo.
- KPI icons: real-time power, today generation, total generation, today CO2 reduction, total CO2 reduction.
- Ornaments: leaf watermark, gold line.
- QA focus: hero image must blend with left-side copy and warm fade without reducing KPI readability.

### Solar

- Hero photo: solar carport or solar panel field.
- Flow icons: solar panel, inverter, factory consumption, CO2 reduction.
- KPI icons: generation, self-consumption, CO2 today, CO2 total, efficiency.
- QA focus: flow node icons and KPI icons must share one icon grammar.

### FactoryCircuit

- Circuit node icons: source, inverter, switchboard, equipment/load, endpoints.
- Load row icons: equipment, lighting, HVAC, production.
- Routing lines should remain React/SVG/CSS-rendered, not bitmap assets.
- QA focus: asset polish must not weaken electrical topology or status meaning.

### Images

- Gallery photos.
- Placeholder.
- Info/location icon.
- Arrow icons only if not supplied by the runtime icon library.
- QA focus: gallery set must share crop, color grading, and thumbnail readability.

### Sustainability

- Hero photo: green factory or ESG achievement scene.
- KPI/ESG icons: energy, CO2, tree, renewable energy, efficiency, supply chain.
- QA focus: achievement and brand tone, not real-time monitoring tone.

## Photo workflow

Use for hero and gallery photos.

1. Draft the manifest record.
2. Select the shared style and the page recipe.
3. Generate or curate 4-8 candidates.
4. Reject candidates with baked-in text, brand-like marks, fake signage, distorted industrial details, overly dark lighting, or inconsistent color tone.
5. Select 1-2 candidates for post-processing.
6. Crop to the target ratio.
7. Normalize color temperature, saturation, midtone brightness, and sharpness.
8. Export as `.webp`.
9. Place in the target page route or managed asset slot.
10. Run preview QA before approval.

Default sizes:

- Hero photo: `2400x1350` or `2880x1620` webp.
- Gallery photo: `2400x1350` webp.
- Thumbnail derivatives are generated from approved source images, not separately prompted.

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

Default SVG targets:

- KPI icon: `viewBox 0 0 96 96`.
- Flow or circuit node icon: `viewBox 0 0 128 128`.
- Load row or ESG icon: `viewBox 0 0 96 96`.

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

1. Start with the asset manifest rows.
2. Then provide the prompt recipe or recipe id.
3. Then provide export and QA steps.
4. Do not mark an asset approved unless QA evidence exists.
5. If the user asks for immediate visual generation, still state the manifest assumptions first, then generate candidates.
