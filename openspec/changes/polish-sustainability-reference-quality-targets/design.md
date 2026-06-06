## Context

Sustainability already has a dedicated playback page, hero media asset, layout/view-model tests, household-equivalent runtime helpers, and editor-backed display page config. Its closeout should tune story rhythm and display hierarchy without turning the page into a management KPI dashboard.

The required boundary comes from `capture-fhd-reference-informed-playback-witness-classifications`: header/footer differences classified as `protected-product-choice` are not eligible for tuning, while hero/ring, Trees/stat card, and highlight rail rows classified as `reference-quality-target` are eligible.

## Goals / Non-Goals

**Goals:**

- Improve ring ornament and hero media overlap.
- Improve Trees/stat card rhythm and supporting copy hierarchy.
- Improve highlight rail density and story pacing.
- Preserve accepted shared header/footer height, position, and information density.
- Keep tuning editor-maintainable through existing display page config/seed paths.
- Produce before/after witness notes for Sustainability.

**Non-Goals:**

- No runtime data contract, sustainability API, or household equivalent logic change.
- No new editor schema/control or server validation.
- No production asset replacement.
- No global shell CSS changes.
- No launch-ready claim.

## Decisions

### Keep Sustainability As Story Playback

Sustainability remains a playback story page. Polishing must maintain story/stat hierarchy, hero visual emphasis, and highlight rail pacing; it must not collapse into a generic KPI dashboard or management summary grid.

### Tune Existing Editor-Backed Values Only

This change can adjust seed fallback values, config defaults, layout constants consumed by existing config, and tests for those values. It must not add page-local runtime hardcodes outside the editor-maintainable config path.

### Actual Gaps Become Follow-Up Work

If fresh witness proves ring ornament overlap, hero media treatment, or highlight rail density needs cannot be represented by current fields, this change records `actual-gap` follow-up rows instead of adding schema or one-off CSS bypasses.

## Implementation Contract

**Observable behavior:** Sustainability page content moves closer to reference quality in hero/ring composition, stat rhythm, and highlight rail density while shared shell remains stable.

**Interface / data shape:** Only existing display page config fields, seed config values, page renderer consumption of existing fields, docs, and focused tests are in scope.

**Failure modes:** If fresh witness is unavailable, the change cannot claim visual improvement; it must record blocker and leave launch matrix blocked.

**Acceptance criteria:** Focused Sustainability config/layout/view-model/seed tests pass; full web tests pass; Spectra analyze/validate pass; evidence notes show protected shell boundaries unchanged.

**Scope boundaries:** No API, no editor schema, no runtime data model, no household equivalent logic, no shared shell, no other pages.

## Risks / Trade-offs

- [Risk] Story polish creates dashboard drift → Mitigation: evidence and tests keep story/stat hierarchy explicit.
- [Risk] CSS tuning bypasses editor config → Mitigation: renderer/CSS changes can only consume existing resolved config values.
- [Risk] Ring overlap needs new controls → Mitigation: record `actual-gap` and defer to an editor capability change.
