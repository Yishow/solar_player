## Context

Factory Circuit already has page-specific runtime primitives, reference assets, icon vocabulary tests, layout tests, and editor-backed display page config. The closeout therefore should tune existing display primitives rather than rewrite the page or introduce a management-oriented representation.

The required boundary comes from `capture-fhd-reference-informed-playback-witness-classifications`: header/footer differences classified as `protected-product-choice` are not eligible for tuning, while circuit/load/ornament rows classified as `reference-quality-target` are eligible.

## Goals / Non-Goals

**Goals:**

- Improve circuit line weight, routing rhythm, node spacing, and source-like visual density.
- Improve `DisplayLeafOrnament` opacity/scale so it reads as display decoration rather than noise.
- Improve load panel hierarchy without converting it into a management table.
- Preserve accepted shared header/footer height, position, and information density.
- Keep tuning editor-maintainable through existing display page config/seed paths.
- Produce before/after witness notes for Factory Circuit.

**Non-Goals:**

- No new editor schema/control or server validation.
- No runtime data contract or load API change.
- No icon asset replacement unless an existing config path already selects the asset.
- No global shell CSS changes.
- No launch-ready claim.

## Decisions

### Preserve Circuit Display Language

Factory Circuit remains a display playback page. Polishing must keep circuit routing, factory/source icon vocabulary, and visual hierarchy dominant; it must not collapse into a dense table, admin card stack, or generic dashboard.

### Tune Existing Editor-Backed Values Only

This change can adjust seed fallback values, config defaults, layout constants consumed by existing config, and tests for those values. It must not add page-local runtime hardcodes outside the editor-maintainable config path.

### Actual Gaps Become Follow-Up Work

If fresh witness proves connector stroke treatment, ornament controls, or load hierarchy needs cannot be represented by current fields, this change records `actual-gap` follow-up rows instead of adding schema or one-off CSS bypasses.

## Implementation Contract

**Observable behavior:** Factory Circuit page content moves closer to reference quality in circuit rhythm, ornament treatment, and load panel hierarchy while shared shell remains stable.

**Interface / data shape:** Only existing display page config fields, seed config values, page renderer consumption of existing fields, docs, and focused tests are in scope.

**Failure modes:** If fresh witness is unavailable, the change cannot claim visual improvement; it must record blocker and leave launch matrix blocked.

**Acceptance criteria:** Focused Factory Circuit config/layout/vocabulary/card tests pass; full web tests pass; Spectra analyze/validate pass; evidence notes show protected shell boundaries unchanged.

**Scope boundaries:** No API, no editor schema, no runtime data model, no shared shell, no other pages.

## Risks / Trade-offs

- [Risk] Circuit polish creates management-surface drift → Mitigation: node vocabulary and card-family tests stay in scope.
- [Risk] CSS tuning bypasses editor config → Mitigation: renderer/CSS changes can only consume existing resolved config values.
- [Risk] Ornament treatment needs a new control → Mitigation: record `actual-gap` and defer to an editor capability change.
