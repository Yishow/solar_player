## Context

The repository now contains a Codex multi-agent setup, with `frontend_guide` registered for frontend UX/UI work. Display playback pages also already have runtime definitions, seed configs, managed media bindings, and preview surfaces. What is missing is a stable asset-generation workflow that speaks the same language as the code: page, slot, asset key, source mode, recipe, version, status, and preview QA.

Without this workflow, generated assets can look good in isolation but fail once placed into the 1920×1080 playback shell: photos may fight the title fade, icons may mismatch stroke weight, ornaments may drift from tokens, and slideshow previews may expose management-style artifacts.

## Goals / Non-Goals

**Goals:**

- Add a dedicated Codex agent for display asset generation and governance.
- Define a reusable asset manifest template for display page assets.
- Define prompt recipes for shared style and page-specific asset generation.
- Define post-process/export rules for photos, SVG icons, ornaments, and placeholders.
- Define preview QA steps that validate assets inside actual display pages and slideshow preview.

**Non-Goals:**

- No production bitmap/SVG asset generation in this change.
- No external AI image service integration.
- No backend schema or upload pipeline change.
- No automatic approval of generated assets without manual preview QA.

## Decisions

### Treat asset generation as a skill, not as loose prompts

The new `display_asset_guide` agent defines the operating rules for asset generation. It requires manifest-first workflow, stable prompt recipes, explicit output specs, post-processing, and preview QA. This prevents one-off prompts from becoming production assets without traceability.

### Use manifest records as the bridge between design intent and runtime config

Every generated asset should have a record describing its page, slot, role, format, target size, source mode, recipe, version, status, and QA notes. This record is the bridge between design generation and runtime config references such as seed defaults, managed assets, or direct-src fallbacks.

### Separate photo, icon, and ornament generation paths

Hero/gallery photos, SVG icons, and ornaments have different failure modes and should not share one generic prompt. Photos need composition, color, and fade compatibility. Icons need SVG normalization, viewBox, stroke width, and currentColor. Ornaments need token-driven opacity and a quiet display-wall role.

### Keep generated image content text-free

Display pages should render all operational text, numbers, labels, values, and status through React/CSS. Generated photos must not include logos, UI labels, fake signage, numbers, or unreadable text baked into the bitmap.

### Preview QA is mandatory before approval

A single generated asset is not accepted until it is reviewed in page context: `/overview`, `/solar`, `/factory-circuit`, `/images`, `/sustainability`, and where relevant `/slideshow-preview`. Approval is visual and contextual, not just file-based.

## Implementation Contract

**Behavior**

- A Codex agent named `display_asset_guide` SHALL exist and describe how to plan, generate, export, and validate display page assets.
- `.codex/config.toml` SHALL register `display_asset_guide` so the skill is discoverable alongside `frontend_guide`.
- Display asset docs SHALL define manifest-first workflow, prompt recipe structure, export specs, post-process rules, and preview QA.
- Generated or proposed assets SHALL be tracked through manifest records before being treated as approved production assets.

**Interface / data shape**

- Manifest records SHALL include page, slot, assetKey, role, format, targetSize, sourceMode, promptRecipe, version, status, and qaNotes.
- Prompt recipes SHALL include shared style, page intent, asset role, composition, constraints, and negative prompt sections.
- Docs SHALL distinguish hero/gallery photos, icons, ornaments, and placeholders.

**Failure modes**

- If an asset cannot be traced to a recipe and manifest record, it remains draft/candidate and cannot be marked approved.
- If a generated photo includes text, logo-like marks, fake UI, unreadable signage, or people/license plate details, it fails QA.
- If an icon cannot be normalized to the shared SVG style, it remains a concept reference and does not become a production icon.
- If an asset looks good alone but fails preview QA, it is revised or deprecated rather than approved.

**Acceptance criteria**

- `display_asset_guide` exists and is registered in `.codex/config.toml`.
- Asset generation docs exist under `docs/display-assets/`.
- The manifest template covers all required fields.
- Prompt recipes cover shared style and page-specific roles for Overview, Solar, FactoryCircuit, Images, and Sustainability.
- Skill docs include preview QA for all five playback pages and slideshow preview.
- `spectra validate --strict --changes add-display-asset-generation-skills` succeeds.

## Risks / Trade-offs

- **Risk:** The skill becomes documentation only and is ignored.  
  **Mitigation:** Register the Codex agent and connect docs to manifest/QA workflow.
- **Risk:** Manifest feels heavy for quick experimentation.  
  **Mitigation:** Allow `draft` and `candidate` statuses but require manifest before approval.
- **Risk:** AI-generated assets produce artifacts.  
  **Mitigation:** Require negative prompts, post-processing, and preview QA before approval.
- **Risk:** Icons generated as bitmaps reduce consistency.  
  **Mitigation:** Treat AI icon output as concept only; final production icon must be normalized SVG.
