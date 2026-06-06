## Context

Overview/Solar closeout depends on the boundary classification change. It should only tune confirmed `reference-quality-target` rows and preserve `protected-product-choice` shell boundaries.

Both pages already have editor-maintainable config surfaces for hero typography/media, KPI card style/geometry, and Solar flow geometry/icon source. If witness proves connector stroke or node treatment cannot be expressed by existing controls, that becomes `actual-gap` for a separate editor capability change rather than a page-local hardcode.

## Goals / Non-Goals

**Goals:**

- Improve Overview hero photo fade, bilingual copy rhythm, and KPI row display hierarchy.
- Improve Solar flow connector/node presentation and KPI row rhythm.
- Preserve accepted shared header/footer height, position, and information density.
- Keep changes editor-maintainable through existing display page config/seed paths.
- Produce before/after witness notes for both pages.

**Non-Goals:**

- No Factory Circuit, Images, or Sustainability tuning.
- No new editor schema/control or server validation.
- No launch-ready claim.
- No global shell CSS changes.

## Decisions

### Tune Existing Editor-Backed Values Only

This change can adjust seed fallback values and tests for existing config fields. It must not hardcode page-local values outside the editor-maintainable config path.

### Preserve Shell Boundaries

Any header/footer difference classified as `protected-product-choice` remains protected. Page tuning must not alter shared shell files or shell dimensions.

### Actual Gaps Become Follow-Up Work

If Solar connector treatment or Overview media quality cannot be expressed by current controls, this change records an `actual-gap` instead of expanding scope.

## Implementation Contract

**Observable behavior:** Overview and Solar look closer to reference quality in page content while shared shell remains stable.

**Interface / data shape:** Only existing display page config fields, seed config values, docs, and focused tests are in scope.

**Failure modes:** If fresh witness is unavailable, the change cannot claim visual improvement; it must record blocker and leave launch matrix blocked.

**Acceptance criteria:** Focused tests for Overview/Solar config rendering and seed values pass; full web tests pass; Spectra analyze/validate pass; evidence notes show protected shell boundaries unchanged.

**Scope boundaries:** No runtime data contract, no API, no editor schema, no shell CSS, no other pages.

## Risks / Trade-offs

- [Risk] Visual polish accidentally moves shell → Mitigation：tests/docs must assert protected shell files are untouched.
- [Risk] Seed tuning bypasses live editor values → Mitigation：verify runtime still reads resolved display config.
- [Risk] Solar connector needs new capability → Mitigation：record `actual-gap`, do not force a CSS-only workaround.
