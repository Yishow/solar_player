# display-launch-witness-gates Specification

## Purpose

Define one authoritative launch witness matrix and verification pack for the five display playback pages and their related editor-to-runtime handoff.

## Requirements

### Requirement: Define a launch witness matrix for the five playback pages

The system SHALL define a launch witness matrix for `Overview`, `Solar`, `Factory Circuit`, `Images`, and `Sustainability`. The matrix SHALL record authoring coverage, runtime parity, publish refresh, fallback behavior, and operator handoff readiness for each page before the product is treated as launch-ready. This matrix SHALL be the single authoritative launch status ledger for page-by-page pass, fail, or blocked outcomes.

#### Scenario: Launch review evaluates each playback page explicitly

- **WHEN** a launch review is prepared for the display product
- **THEN** the review includes a page-by-page witness matrix for all five playback pages
- **AND** each page has explicit pass, fail, or blocked status for the required launch gates

##### Example: Sustainability is not treated as launch-ready from editor coverage alone

- **GIVEN** `Sustainability` already has editor authoring coverage
- **WHEN** runtime parity or fallback review is still missing
- **THEN** the witness matrix records the missing launch gate explicitly
- **AND** the page is not treated as fully launch-ready yet

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - openspec/specs/display-launch-witness-gates/spec.md
  - openspec/specs/display-editor-page-authoring-coverage/spec.md
  - openspec/specs/display-page-draft-live-publishing/spec.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/reference-match/display-launch-verification-pack.md
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/all-pages-checklist.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
-->

---
### Requirement: Keep launch status in one authoritative matrix

The launch workflow SHALL keep page-by-page launch status in a single authoritative witness matrix. Supporting audit checklists, reference-match notes, and verification procedures SHALL point to that matrix instead of maintaining parallel launch status ledgers.

#### Scenario: Supporting docs do not create a second launch ledger

- **WHEN** a reviewer updates audit notes, checklists, or the launch verification pack
- **THEN** those supporting documents point back to the witness matrix for pass, fail, or blocked status
- **AND** the reviewer does not need to reconcile multiple competing launch status files

##### Example: Verification pack records results back into the matrix

- **GIVEN** a reviewer reruns publish refresh and fallback checks for `Images`
- **WHEN** they finish the verification steps in the launch verification pack
- **THEN** the pass or fail result is recorded in the witness matrix
- **AND** the verification pack remains a procedure document rather than a second status ledger

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - openspec/specs/display-launch-witness-gates/spec.md
  - openspec/specs/display-editor-page-authoring-coverage/spec.md
  - openspec/specs/display-page-draft-live-publishing/spec.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/reference-match/display-launch-verification-pack.md
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/all-pages-checklist.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
-->

---
### Requirement: Treat publish refresh and fallback verification as launch blockers

The launch workflow SHALL treat failed publish refresh, broken runtime fallback, blank degraded states, or unrecoverable editor-to-runtime handoff as launch blockers for the display product.

#### Scenario: Publish success without live refresh blocks launch

- **WHEN** an operator can save or publish a display-related draft but the live playback does not refresh as expected
- **THEN** the launch witness matrix records that failure as a blocker
- **AND** the release SHALL NOT be treated as launch-ready until the refresh witness passes

##### Example: Images fallback remains mandatory

- **GIVEN** `Images` depends on playlist entries and fallback modes
- **WHEN** the active media is unavailable or degraded
- **THEN** the playback surface still presents the expected fallback behavior
- **AND** a blank or broken fallback state blocks launch approval

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - openspec/specs/display-launch-witness-gates/spec.md
  - openspec/specs/display-editor-page-authoring-coverage/spec.md
  - openspec/specs/display-page-draft-live-publishing/spec.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/reference-match/display-launch-verification-pack.md
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/all-pages-checklist.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
-->

---
### Requirement: Keep launch verification evidence inside the repo workflow

The launch workflow SHALL provide a repeatable verification pack inside the repo that lists the required commands, manual witness checks, and result-recording format for display launch approval. The workflow SHALL NOT depend on undocumented tribal knowledge.

#### Scenario: A new reviewer can run the launch verification pack

- **WHEN** a teammate who did not build the feature performs launch review
- **THEN** they can find the launch verification pack and witness matrix in the repo
- **AND** they can follow the documented checks without reconstructing the process from memory

##### Example: A new reviewer reruns the launch pack for Images and Sustainability

- **GIVEN** a reviewer did not participate in the original implementation
- **WHEN** they open the documented verification pack for `Images` and `Sustainability`
- **THEN** they can find the targeted commands, manual witness steps, and pass or fail recording format
- **AND** they do not need to recover the release process from chat history

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - openspec/specs/display-launch-witness-gates/spec.md
  - openspec/specs/display-editor-page-authoring-coverage/spec.md
  - openspec/specs/display-page-draft-live-publishing/spec.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/reference-match/display-launch-verification-pack.md
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/all-pages-checklist.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
-->
