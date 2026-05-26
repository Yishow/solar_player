---
name: display-asset-generation
description: 'Use this skill whenever the user wants to create, replace, refine, review, or wire visual assets for the five solar_player playback pages: Overview, Solar, FactoryCircuit, Images, and Sustainability. This skill is optimized for low-friction requests like "幫 Solar 換 hero 圖", "補幾個 Sustainability icon", or "幫 Images 做一組一致的圖". Use it even when the user does not know the exact file, route, source mode, or asset path.'
---

# Display Asset Generation Skill

This skill is for quickly producing assets for the five playback pages without making the user remember repo internals.

Primary targets:

- `Overview`
- `Solar`
- `FactoryCircuit`
- `Images`
- `Sustainability`

`/slideshow-preview` is a QA surface, not a separate design target.

Detailed guidance and examples live in `README.md` beside this file.

## Default behavior

When this skill triggers:

1. Infer the page and asset type from the user's wording.
2. If the request affects more than one page or could change route-level presentation, identify the `witness batch`, `evidence bundle`, and relevant `visual canonicals` first.
3. Inspect the current page wiring before proposing file changes.
4. Choose the smallest asset path that matches the current repo pattern.
5. Generate or wire only the requested asset.
6. Verify on the target route and, when relevant, `/slideshow-preview` and any downstream `launch witness gate`.

Do not force the user to provide:

- exact route names
- source mode names
- asset path conventions
- manifest fields
- prompt recipe ids

Translate the user's request into those details yourself.

If you need the repo's FHD workflow map, start from `docs/reference-match/fhd-workflow-entrypoints.md`.

## Fast request examples

Treat requests like these as direct triggers:

- "幫 Overview 換 hero 圖"
- "幫 Solar 補一組比較一致的 icon"
- "Factory Circuit 的 load icon 太醜，重做一下"
- "Images 頁面想換一批比較乾淨的現場照片"
- "Sustainability 補幾個比較像同系列的 ESG icon"
- "幫我看這 5 頁現在哪些素材最值得先補"

## First decision: what kind of asset is this?

Map the request to one of these asset paths:

| Request type | Usual implementation path |
| --- | --- |
| Hero image / gallery photo | page config media binding: `managed-asset`, `direct-src`, or `seed-default` |
| Page-local raster icon | `asset-image` source |
| Shared glyph-like icon | `reference-glyph` source |
| Page-owned vector icon set | `page-icon-key` plus the page `iconRegistry.tsx` |
| Ornament / decorative chrome | page-local chrome config or existing ornament component/CSS |
| Placeholder / fallback icon | usually `reference-glyph`, `page-icon-key`, or a small page-local asset |

Do not assume every icon should become a new SVG file. The current repo already uses three icon source modes:

- `asset-image`
- `reference-glyph`
- `page-icon-key`

## Current repo reality

Follow the real implementation patterns already in the repo.

### Media source modes

Hero and gallery-like media are wired through:

- `managed-asset`
- `direct-src`
- `seed-default`

Relevant files usually include:

- `apps/web/src/pages/*/displayPageConfig.ts`
- `apps/web/src/pages/*/assets.ts`
- `packages/shared/src/displayPageConfig.ts`

### Icon source modes

Icons are wired through:

- `asset-image`
- `reference-glyph`
- `page-icon-key`

Relevant files usually include:

- `apps/web/src/pages/*/displayPageConfig.ts`
- `apps/web/src/pages/*/iconRegistry.tsx`
- `apps/web/src/pages/shared/displayIconSourceConfig.ts`
- `apps/web/src/components/displayPageIconResolver.tsx`

## Page-specific patterns

Use these defaults unless the current code says otherwise:

### Overview

- Hero: media binding in `apps/web/src/pages/Overview/displayPageConfig.ts`
- Seed hero reference: `apps/web/src/pages/Overview/assets.ts`
- KPI icons: mostly `reference-glyph`
- Ornaments: page chrome config, not separate asset governance

### Solar

- Hero: media binding in `apps/web/src/pages/Solar/displayPageConfig.ts`
- Seed hero and raster icons: existing generated/reference assets
- Flow/KPI icons: mostly `asset-image`
- This is the page with the most explicit existing asset binding

### FactoryCircuit

- Icons: primarily `page-icon-key`
- Registry implementation: `apps/web/src/pages/FactoryCircuit/iconRegistry.tsx`
- Do not replace topology lines with bitmap artwork

### Images

- Main stage: media binding in `apps/web/src/pages/Images/displayPageConfig.ts`
- Gallery behavior also depends on runtime playlist/fallback logic
- Placeholder/info imagery is often glyph-driven, not a standalone asset pipeline

### Sustainability

- Hero: media binding in `apps/web/src/pages/Sustainability/displayPageConfig.ts`
- KPI/stat icons: primarily `page-icon-key`
- Registry implementation: `apps/web/src/pages/Sustainability/iconRegistry.tsx`

## Workflow

### 1. Identify the target

Infer:

- page
- slot or area
- asset class
- whether the user wants new generation, refinement, or only wiring

Ask one clarifying question only if ambiguity would change the implementation path.

### 2. Inspect before changing

Check the real files that own the asset:

- page `displayPageConfig.ts`
- page `assets.ts`
- page `iconRegistry.tsx`
- shared icon/media resolver files if the request crosses page boundaries

Do not invent a new asset storage convention if the page already has one.

### 3. Choose the smallest valid implementation

Prefer this order:

1. Reuse existing source mode and swap the underlying asset or config value.
2. Extend an existing page icon registry if the page already uses `page-icon-key`.
3. Add a page-local asset-image source when the page already uses raster icons.
4. Introduce a new asset file or new pattern only if the current page cannot express the requested result.

### 4. Generate or wire

If the user needs a new photo-like asset:

- keep the page's warm ivory / green-energy display tone
- avoid baked-in text, UI, logos, watermarks, and fake signage
- prefer crops that leave readable title/card areas intact

If the user needs a new icon:

- match the page's current icon grammar
- prefer the existing source mode for that page
- only build a standalone SVG asset when that is the simplest fit

### 5. Verify in the actual page

Check the target playback route:

- `/overview`
- `/solar`
- `/factory-circuit`
- `/images`
- `/sustainability`

Also check `/slideshow-preview` when the asset is visible there.

Verification questions:

- Is the page readable within three seconds?
- Does the new asset match the existing page family?
- Does it avoid colliding with title, KPI, or diagram content?
- If this is an icon set, do the icons still feel like one family?

## Response structure when using this skill

Keep responses practical and low-friction:

1. State what page and asset type you inferred.
2. State which files or source mode you will touch.
3. Make the asset or wiring change.
4. Report the verification result.

Do not start with manifest templates unless the user explicitly asks for asset governance, inventory, or recipe documentation.

## Governance is optional, not the default

Manifest rows, prompt recipes, and formal QA notes are useful when the user asks for:

- a reusable asset inventory
- a prompt library
- approval tracking
- page-by-page asset planning

In those cases, also consult:

- `README.md`
- `docs/display-assets/README.md`
- `docs/display-assets/asset-manifest.template.md`
- `docs/display-assets/prompt-recipes/`

But for ordinary requests, optimize for speed and correctness first.
