# fhd-reference-informed-closeout-boundaries Specification

## Purpose

Define how FHD closeout classifies reference differences into protected product choices, quality targets, and actionable launch gaps.

## Requirements

### Requirement: Classify material reference differences before FHD closeout implementation

The FHD closeout workflow SHALL classify every material difference between the current product surface and the FHD reference witness before implementation work is planned for playback visuals or shared display chrome. Each material difference SHALL receive exactly one classification token: `protected-product-choice`, `reference-quality-target`, or `actual-gap`.

#### Scenario: A playback closeout review classifies reference differences

- **WHEN** a reviewer prepares FHD closeout for a playback page or shared display shell
- **THEN** each material reference difference receives exactly one classification token
- **AND** the classification token is one of `protected-product-choice`, `reference-quality-target`, or `actual-gap`
- **AND** implementation tasks use the classification to decide whether to preserve, tune toward reference quality, or resolve a gap

##### Example: Shell and page content receive separate classifications

| Surface | Difference | Classification | Implementation consequence |
| ----- | ----- | ----- | ----- |
| Shared header | Current height and position differ from the reference but are accepted by product review | `protected-product-choice` | Preserve current header height and position during page polish |
| Overview hero | Current media and title hierarchy lack reference-like editorial depth | `reference-quality-target` | Tune hierarchy and media integration without pixel matching |
| Images runtime gallery | Runtime content cannot produce a launch witness for the expected playlist state | `actual-gap` | Keep the launch gate blocked until runtime evidence exists |


<!-- @trace
source: define-fhd-reference-informed-closeout-boundaries
updated: 2026-06-05
code:
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/fhd-editor-gap-ledger.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/display-surface-visual-review-checklist.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/goal.md
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Protected product choices require bounded evidence

A reference difference classified as `protected-product-choice` SHALL record the surface, protected attributes, accepted-by owner, witness evidence, and revisit trigger. A protected product choice SHALL NOT waive visual review for attributes outside the recorded protected scope.

#### Scenario: Header and footer shell choices are protected without covering page content

- **WHEN** the shared header or footer height, position, or information density is classified as `protected-product-choice`
- **THEN** the decision records the exact shell attributes being protected
- **AND** the decision records who accepted the product choice, which witness evidence supports it, and what trigger requires review again
- **AND** page content such as hero media, KPI rows, flow diagrams, circuit panels, media stages, captions, ornaments, and highlight rails remains separately classifiable


<!-- @trace
source: define-fhd-reference-informed-closeout-boundaries
updated: 2026-06-05
code:
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/fhd-editor-gap-ledger.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/display-surface-visual-review-checklist.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/goal.md
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Reference quality targets describe direction without pixel matching

A reference difference classified as `reference-quality-target` SHALL record the surface, reference quality cue, implementation consequence, and witness evidence. A reference quality target SHALL NOT require exact reference geometry, exact pixel position, exact typography values, or exact crop ratios unless a separate `actual-gap` decision records that requirement.

#### Scenario: Page polish follows reference quality without strict geometry matching

- **WHEN** a playback page uses the reference to guide visual polish
- **THEN** the boundary decision records concrete quality cues such as hierarchy, density, photo integration, ornament balance, rhythm, or source-like flow language
- **AND** the implementation consequence describes which product surface needs tuning
- **AND** the decision does not require pixel-exact matching by default

##### Example: Solar flow quality target

- **GIVEN** the Solar page has `reference-quality-target` for flow connector clarity, source-like node language, and KPI row rhythm
- **WHEN** implementation planning begins
- **THEN** tasks tune Solar flow and KPI presentation toward those quality cues
- **AND** accepted shared header or footer attributes remain outside the Solar flow tuning scope


<!-- @trace
source: define-fhd-reference-informed-closeout-boundaries
updated: 2026-06-05
code:
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/fhd-editor-gap-ledger.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/display-surface-visual-review-checklist.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/goal.md
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Actual gaps remain actionable and verifiable

A reference difference classified as `actual-gap` SHALL record the surface, gap type, implementation consequence, verification gate, witness evidence, and revisit trigger. The gap type SHALL identify whether the blocker is editor capability, runtime parity, asset or content state, fallback behavior, publish refresh, visual tuning, or handoff evidence.

#### Scenario: A real launch blocker is not hidden by an accepted reference difference

- **WHEN** a playback page has an accepted shared shell difference and an unresolved page-local blocker
- **THEN** the shell difference can remain classified as `protected-product-choice`
- **AND** the page-local blocker remains classified as `actual-gap`
- **AND** the launch gate remains fail or blocked until the verification gate for the actual gap passes


<!-- @trace
source: define-fhd-reference-informed-closeout-boundaries
updated: 2026-06-05
code:
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/fhd-editor-gap-ledger.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/display-surface-visual-review-checklist.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/goal.md
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Boundary decisions remain supporting evidence rather than launch status ledgers

Reference-informed boundary decisions SHALL support the authoritative launch witness matrix without replacing it. The launch witness matrix SHALL remain the source of pass, fail, or blocked status for the five playback pages.

#### Scenario: Boundary evidence informs the launch matrix

- **WHEN** a reviewer completes boundary classification for Overview, Solar, Factory Circuit, Images, or Sustainability
- **THEN** the reviewer records or references the decision in the launch witness matrix
- **AND** the boundary decision explains the rationale for visual pass, fail, or blocked status
- **AND** the boundary document does not become a second page-level launch status ledger

##### Example: Overview status uses boundary rationale

- **GIVEN** Overview has `protected-product-choice` for shared header height and `reference-quality-target` for hero photo fade and KPI row rhythm
- **WHEN** the reviewer updates the Overview row in the launch witness matrix
- **THEN** the row references the protected shell decision as visual rationale
- **AND** the row keeps the page content gate fail or blocked until the hero and KPI witness passes

<!-- @trace
source: define-fhd-reference-informed-closeout-boundaries
updated: 2026-06-05
code:
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/fhd-editor-gap-ledger.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/display-surface-visual-review-checklist.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/goal.md
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->