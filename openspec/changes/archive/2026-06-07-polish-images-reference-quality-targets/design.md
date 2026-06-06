## Context

Images already has a dedicated playback page, media assets, view-model tests, layout tests, and editor-backed display page config. Its closeout should improve the visual read of the media stage and supporting captions without treating the page as a management asset browser.

The required boundary comes from `capture-fhd-reference-informed-playback-witness-classifications`: header/footer differences classified as `protected-product-choice` are not eligible for tuning, while media stage, thumbnail, and caption rows classified as `reference-quality-target` are eligible.

## Goals / Non-Goals

**Goals:**

- Improve media stage crop/fit and visual weight.
- Improve thumbnail strip density and relationship to the primary media.
- Improve caption card typography, hierarchy, and display tension.
- Preserve accepted shared header/footer height, position, and information density.
- Keep tuning editor-maintainable through existing display page config/seed paths.
- Produce before/after witness notes for Images.

**Non-Goals:**

- No playlist governance, upload API, image management, or asset pipeline change.
- No new editor schema/control or server validation.
- No production asset replacement.
- No global shell CSS changes.
- No launch-ready claim.

## Decisions

### Keep Images As Playback Media

Images remains a playback page with a dominant media stage. Polishing must not convert it into an image-management grid, upload workflow, or admin asset table.

### Tune Existing Editor-Backed Values Only

This change can adjust seed fallback values, config defaults, layout constants consumed by existing config, and tests for those values. It must not add page-local runtime hardcodes outside the editor-maintainable config path.

### Actual Gaps Become Follow-Up Work

If fresh witness proves media crop, thumbnail density, or caption style needs cannot be represented by current fields, this change records `actual-gap` follow-up rows instead of adding schema or one-off CSS bypasses.

## Implementation Contract

**Observable behavior:** Images page content moves closer to reference quality in media stage proportion, thumbnail density, and caption hierarchy while shared shell remains stable.

**Interface / data shape:** Only existing display page config fields, seed config values, page renderer consumption of existing fields, docs, and focused tests are in scope.

**Failure modes:** If fresh witness is unavailable, the change cannot claim visual improvement; it must record blocker and leave launch matrix blocked.

**Acceptance criteria:** Focused Images config/layout/view-model/seed tests pass; full web tests pass; Spectra analyze/validate pass; evidence notes show protected shell boundaries unchanged.

**Scope boundaries:** No API, no editor schema, no playlist governance, no asset pipeline, no shared shell, no other pages.

## Risks / Trade-offs

- [Risk] Media polish creates management-surface drift → Mitigation: evidence and tests keep playback media hierarchy explicit.
- [Risk] CSS tuning bypasses editor config → Mitigation: renderer/CSS changes can only consume existing resolved config values.
- [Risk] Stage crop needs new controls → Mitigation: record `actual-gap` and defer to an editor capability change.
