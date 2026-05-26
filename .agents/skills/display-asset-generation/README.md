# Display Asset Generation README

This README explains how the `display-asset-generation` skill should be used in practice.

The main goal is convenience: help produce assets for the five playback pages without making the user remember repo structure, source-mode names, or asset-governance steps.

## Workflow vocabulary

This skill should reuse the same repo vocabulary as the entrypoints:

- `witness batch`
- `evidence bundle`
- `visual canonicals`
- `launch witness gates`

For the canonical map, start from `docs/reference-match/fhd-workflow-entrypoints.md`.

## What this skill is for

Use this skill when the user wants to:

- make a new hero image
- replace an existing hero image
- add or refine icons
- make page assets feel more consistent
- improve the visual quality of one playback page
- wire a newly generated asset into a page
- review which of the five pages still need better assets

Primary playback pages:

- `Overview`
- `Solar`
- `FactoryCircuit`
- `Images`
- `Sustainability`

QA companion route:

- `/slideshow-preview`

## What the user should be able to say

The user should not need to know technical names.

Good example requests:

- "幫 Overview 換 hero 圖"
- "Solar 那幾個 icon 風格不一致，整理一下"
- "幫 Factory Circuit 做一組比較清楚的設備 icon"
- "Images 頁面換成比較有質感的現場照片"
- "Sustainability 補幾個 ESG 相關圖示"
- "看一下這 5 頁哪些素材最弱，先補最重要的"

The skill should translate these into implementation details on its own.

## Mental model

When a request arrives, think in this order:

1. Which page is this for?
2. What is the `witness batch` for this request?
3. Which `visual canonicals` matter for this page?
4. Is this media, icon, ornament, or placeholder work?
5. What is the page already using today?
6. What is the smallest change that fits the current implementation?
7. Which route should be checked after the change, and does any `launch witness gate` become relevant?

Do not start from an ideal asset-governance process.
Start from the page the user wants fixed.

## Repo patterns that matter

The current repo does not use one single universal asset pipeline.

### Media source modes

Hero and gallery-like media are usually wired through `DisplayPageMediaBinding`:

- `managed-asset`
- `direct-src`
- `seed-default`

Shared type:

- `packages/shared/src/displayPageConfig.ts`

Typical owners:

- `apps/web/src/pages/Overview/displayPageConfig.ts`
- `apps/web/src/pages/Solar/displayPageConfig.ts`
- `apps/web/src/pages/Images/displayPageConfig.ts`
- `apps/web/src/pages/Sustainability/displayPageConfig.ts`

Related runtime references sometimes live in:

- `apps/web/src/pages/*/assets.ts`

### Icon source modes

The repo already supports three icon source strategies:

- `asset-image`
- `reference-glyph`
- `page-icon-key`

Shared config and resolver:

- `apps/web/src/pages/shared/displayIconSourceConfig.ts`
- `apps/web/src/components/displayPageIconResolver.tsx`

This matters because not every icon task should create a new asset file.

## Current page-by-page reality

### Overview

Relevant files:

- `apps/web/src/pages/Overview/displayPageConfig.ts`
- `apps/web/src/pages/Overview/assets.ts`

Current pattern:

- hero image uses media binding
- KPI icons mostly use `reference-glyph`
- ornaments are part of chrome config

Implication:

- for hero replacement, edit the media path/binding
- for KPI icon work, prefer glyph/config-level alignment before inventing a new asset set

### Solar

Relevant files:

- `apps/web/src/pages/Solar/displayPageConfig.ts`
- `apps/web/src/pages/Solar/assets.ts`

Current pattern:

- hero image uses media binding
- flow and KPI icons are mostly `asset-image`
- many existing seed assets point at generated or reference PNG sources

Implication:

- if the user wants a better icon set, replacing raster icon sources may be the shortest path
- this page already has the clearest "asset-bound page" behavior

### FactoryCircuit

Relevant files:

- `apps/web/src/pages/FactoryCircuit/displayPageConfig.ts`
- `apps/web/src/pages/FactoryCircuit/iconRegistry.tsx`

Current pattern:

- icons are mainly `page-icon-key`
- shapes are rendered by code
- topology lines stay in app rendering

Implication:

- prefer updating the registry or adding a new registry icon
- do not turn circuit semantics into bitmap decorations

### Images

Relevant files:

- `apps/web/src/pages/Images/displayPageConfig.ts`
- `apps/web/src/pages/Images/assets.ts`
- `apps/web/src/pages/Images/viewModel.ts`

Current pattern:

- main stage uses media binding
- page behavior also depends on slideshow and fallback logic
- placeholder/info visuals often rely on glyph-based sources

Implication:

- a "換圖" request may affect either seed fallback media or runtime playlist assumptions
- check whether the user wants fallback visuals or live playlist content

### Sustainability

Relevant files:

- `apps/web/src/pages/Sustainability/displayPageConfig.ts`
- `apps/web/src/pages/Sustainability/assets.ts`
- `apps/web/src/pages/Sustainability/iconRegistry.tsx`

Current pattern:

- hero image uses media binding
- KPI/stat icons mainly use `page-icon-key`
- page tone is more storytelling/achievement than real-time dashboard

Implication:

- for icon tasks, prefer registry updates
- for hero tasks, preserve calm, achievement-oriented composition

## Recommended working style

### Fast mode

This is the default.

Use fast mode when the user just wants assets produced or replaced.

Process:

1. infer page and asset type
2. name the `witness batch` and `evidence bundle` scope if the change affects route-level visuals
3. inspect the current files
4. choose the smallest fitting source mode
5. generate or wire the asset
6. verify on the route

Output style:

- short explanation of what you inferred
- short note on what files or source mode you changed
- verification result

### Planning or governance mode

Only use this when the user explicitly asks for:

- asset inventory
- prompt library
- manifest documentation
- approval tracking
- page-by-page asset planning

Then it is appropriate to also use:

- `docs/display-assets/README.md`
- `docs/display-assets/asset-manifest.template.md`
- `docs/display-assets/prompt-recipes/shared-style.md`
- `docs/display-assets/prompt-recipes/display-pages.md`

This is optional support material, not the required starting point for ordinary tasks.

## Asset-type guidance

### Hero images and gallery photos

Preferred visual direction:

- warm ivory-compatible tone
- green-energy / clean factory / sustainability context
- readable composition from distance
- avoid baked-in text, UI, labels, logos, watermarks, fake signage

Implementation choices:

- keep existing media binding shape when possible
- use `managed-asset` if the page is meant to point at a managed library asset
- use `direct-src` for an explicit path
- use `seed-default` when the page should keep a baked-in fallback source

### Raster icon assets

Use when the page already expects `asset-image`, especially on `Solar`.

Guidelines:

- keep the icon family visually consistent
- avoid wildly different perspective, detail density, or color temperature
- if the page already uses PNG seed icons, do not force a separate SVG pipeline unless it simplifies the result

### Code-driven icons

Use when the page already expects `page-icon-key` or `reference-glyph`.

Guidelines:

- update the page registry if the page uses `page-icon-key`
- reuse existing glyph language if `reference-glyph` is enough
- do not create new files when a code-level icon change is simpler

### Ornaments and decorative chrome

Usually these are not a separate asset library task.

Check:

- page chrome config
- existing ornament components
- CSS-based decorative layers

Only create a new standalone asset if the existing ornament system cannot express the desired result.

## Verification checklist

After changing an asset, inspect the relevant page and ask:

- Is the page understandable within three seconds?
- Does the asset fit the existing visual family?
- Does it avoid blocking title, KPI, or diagram readability?
- If it is a set, do the items feel like one family?
- Does it still work in `/slideshow-preview` when visible there?

Target routes:

- `/overview`
- `/solar`
- `/factory-circuit`
- `/images`
- `/sustainability`
- `/slideshow-preview`

## Common task playbooks

### "換 hero 圖"

1. find the page `displayPageConfig.ts`
2. inspect current `heroMedia`
3. decide whether this should remain `seed-default`, become `direct-src`, or point at `managed-asset`
4. update source path or asset reference
5. verify crop/readability on the page

### "補 icon"

1. inspect whether the page uses `asset-image`, `reference-glyph`, or `page-icon-key`
2. extend the existing system instead of inventing a new one
3. make the minimum changes needed for consistency
4. verify the whole icon set together

### "這頁素材看起來不一致，整理一下"

1. inspect the page's current source mix
2. identify the biggest inconsistency first
3. prefer consolidating to one existing pattern
4. avoid broad refactors unless the user asked for them

### "幫我規劃 5 頁還缺哪些素材"

1. audit page by page
2. group findings into hero, icon, placeholder, ornament, gallery
3. prioritize by visible impact
4. only introduce manifest/recipe output if the user wants tracking artifacts

## What not to do

- Do not require the user to fill out a manifest before ordinary asset work.
- Do not assume every page uses the same asset wiring pattern.
- Do not default every icon task to a new SVG asset file.
- Do not invent a new top-level asset directory if the page already has a working source pattern.
- Do not claim an asset is "approved" just because the file exists; check the route.

## Relationship to existing docs

This README is the practical operating guide.

Use the docs under `docs/display-assets/` when the user wants formal documentation or governance support.

Use the page-local files under `apps/web/src/pages/` when the user wants the asset actually changed.
