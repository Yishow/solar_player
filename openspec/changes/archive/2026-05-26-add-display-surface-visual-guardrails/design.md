## Context

The display surface is a presentation product, not only an app surface. It needs tests that protect visual family consistency even when content changes. Existing tests can verify runtime state, config hydration, and component behavior, but they do not fully prevent design drift such as raw colors reappearing, card primitives being bypassed, preview wrappers showing management chrome, or page geometry changing during a style refactor.

The guardrails should be lightweight and enforceable in normal development. They should not require pixel-perfect visual snapshots or a heavy external service to be useful.

## Goals / Non-Goals

**Goals:**

- Define a repeatable review checklist for display playback visual consistency.
- Add targeted assertions around shared primitives, preview mode, runtime definitions, and geometry preservation.
- Catch common drift patterns early: raw display chrome colors, page-local card skeletons, missing showcase mode, and unintended layout movement.
- Keep the checks small enough to run in the existing web test workflow.

**Non-Goals:**

- No full screenshot diff infrastructure as a mandatory dependency.
- No pixel-perfect prototype matching.
- No freeze on content, media, or metric value changes.
- No replacement for manual display-wall review.

## Decisions

### Use contract tests and review checklist before screenshot infrastructure

Visual regression can become expensive quickly. The first guardrail should be contract-level: ensure pages use shared definitions/primitives, ensure live preview mode is explicit in showcase contexts, and ensure geometry fixtures remain stable. A manual checklist covers qualitative review.

### Treat FHD geometry as a protected contract

Most display quality issues become visible when an element moves unexpectedly. Geometry objects and seed configs should be covered by tests or assertions where practical. Changes to `left/top/width/height` should be intentional and reviewed.

### Add CSS/token drift checks only for shared display chrome roles

The guardrail should not ban all raw values; some SVG data URLs, masks, gradients, and special cases may need literals. It should focus on shared display chrome roles and document allowed exceptions.

### Keep manual review first-class

A large FHD display cannot be fully judged by unit tests. The checklist should ask reviewers to inspect hero typography, image fade, card family, ornament consistency, preview mode, and readability from distance.

## Implementation Contract

**Behavior**

- Display playback page changes SHALL include review against the display surface checklist.
- Shared primitives SHALL be preferred for card, hero chrome, live preview, and display node roles where a shared contract exists.
- FHD geometry changes SHALL be intentional, visible in tasks/review notes, and covered by tests or manual review.
- Showcase preview contexts SHALL not accidentally render editor-only chrome.

**Interface / data shape**

- Guardrail tests are frontend/test/doc only and do not require backend changes.
- Existing OpenSpec validation remains the source of truth for change structure.
- Manual review checklist may live under docs and can reference existing prototype images or reference-match docs.

**Failure modes**

- If a page cannot use a shared primitive, the deviation must be documented in the change or code comment.
- If a geometry change is intentional, the task list must call it out rather than hiding it inside a style refactor.
- If a test cannot reliably inspect a visual role, the manual checklist covers that role.

**Acceptance criteria**

- A display surface review checklist exists and is referenced by relevant changes.
- Tests or assertions cover live preview showcase mode adoption and core shared primitive expectations where practical.
- Geometry drift is explicitly guarded for seed/runtime page configs that own FHD positions.
- The guardrails run through existing test/typecheck workflows without a new external service.
- `spectra validate --strict --changes add-display-surface-visual-guardrails` succeeds.

## Risks / Trade-offs

- **Risk:** Guardrails become too vague to enforce.  
  **Mitigation:** Pair checklist items with concrete testable hooks where practical.
- **Risk:** Guardrails become too strict and block legitimate visual improvements.  
  **Mitigation:** Allow documented exceptions and intentional geometry-change tasks.
- **Risk:** Developers skip manual review.  
  **Mitigation:** Make the checklist short and directly tied to display-page changes.
