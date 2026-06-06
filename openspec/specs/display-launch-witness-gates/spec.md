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


<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/all-pages-checklist.md
  - .codex/hooks/fhd-evidence-reminder.js
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - README.md
  - apps/web/src/pages/Overview/layout.ts
  - CLAUDE.md
  - apps/web/src/layouts/ManagementShell.tsx
  - AGENTS.md
  - docs/FHD.01.html
  - apps/web/src/app/router.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-workflow-entrypoints.md
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - docs/reference-match/display-launch-verification-pack.md
  - apps/web/src/layouts/shellBootstrap.ts
  - docs/README.md
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - docs/reference-match/fhd-surface-split-guide.md
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/displayPageRouteHost.css
  - apps/server/src/app.ts
  - .codex/hooks.json
  - .agents/skills/product-gap-audit/SKILL.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .agents/skills/display-asset-generation/README.md
  - docs/reference-match/playback-visual-canonicals.md
  - apps/web/src/pages/Overview/index.tsx
  - .agents/skills/display-asset-generation/SKILL.md
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-06-05
code:
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/styles/global.css
  - .agents/skills/spectra-analyze/SKILL.md
  - .agents/skills/spectra-verify/SKILL.md
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
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


<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/all-pages-checklist.md
  - .codex/hooks/fhd-evidence-reminder.js
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - README.md
  - apps/web/src/pages/Overview/layout.ts
  - CLAUDE.md
  - apps/web/src/layouts/ManagementShell.tsx
  - AGENTS.md
  - docs/FHD.01.html
  - apps/web/src/app/router.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-workflow-entrypoints.md
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - docs/reference-match/display-launch-verification-pack.md
  - apps/web/src/layouts/shellBootstrap.ts
  - docs/README.md
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - docs/reference-match/fhd-surface-split-guide.md
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/displayPageRouteHost.css
  - apps/server/src/app.ts
  - .codex/hooks.json
  - .agents/skills/product-gap-audit/SKILL.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .agents/skills/display-asset-generation/README.md
  - docs/reference-match/playback-visual-canonicals.md
  - apps/web/src/pages/Overview/index.tsx
  - .agents/skills/display-asset-generation/SKILL.md
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-06-05
code:
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/styles/global.css
  - .agents/skills/spectra-analyze/SKILL.md
  - .agents/skills/spectra-verify/SKILL.md
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
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


<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/all-pages-checklist.md
  - .codex/hooks/fhd-evidence-reminder.js
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - README.md
  - apps/web/src/pages/Overview/layout.ts
  - CLAUDE.md
  - apps/web/src/layouts/ManagementShell.tsx
  - AGENTS.md
  - docs/FHD.01.html
  - apps/web/src/app/router.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-workflow-entrypoints.md
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - docs/reference-match/display-launch-verification-pack.md
  - apps/web/src/layouts/shellBootstrap.ts
  - docs/README.md
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - docs/reference-match/fhd-surface-split-guide.md
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/displayPageRouteHost.css
  - apps/server/src/app.ts
  - .codex/hooks.json
  - .agents/skills/product-gap-audit/SKILL.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .agents/skills/display-asset-generation/README.md
  - docs/reference-match/playback-visual-canonicals.md
  - apps/web/src/pages/Overview/index.tsx
  - .agents/skills/display-asset-generation/SKILL.md
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-06-05
code:
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/styles/global.css
  - .agents/skills/spectra-analyze/SKILL.md
  - .agents/skills/spectra-verify/SKILL.md
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
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

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/all-pages-checklist.md
  - .codex/hooks/fhd-evidence-reminder.js
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - README.md
  - apps/web/src/pages/Overview/layout.ts
  - CLAUDE.md
  - apps/web/src/layouts/ManagementShell.tsx
  - AGENTS.md
  - docs/FHD.01.html
  - apps/web/src/app/router.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-workflow-entrypoints.md
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - docs/reference-match/display-launch-verification-pack.md
  - apps/web/src/layouts/shellBootstrap.ts
  - docs/README.md
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - docs/reference-match/fhd-surface-split-guide.md
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/displayPageRouteHost.css
  - apps/server/src/app.ts
  - .codex/hooks.json
  - .agents/skills/product-gap-audit/SKILL.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .agents/skills/display-asset-generation/README.md
  - docs/reference-match/playback-visual-canonicals.md
  - apps/web/src/pages/Overview/index.tsx
  - .agents/skills/display-asset-generation/SKILL.md
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-06-05
code:
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/styles/global.css
  - .agents/skills/spectra-analyze/SKILL.md
  - .agents/skills/spectra-verify/SKILL.md
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
-->

---
### Requirement: Distinguish protected choices from unresolved gaps in launch witness status

The display launch witness workflow SHALL distinguish accepted protected product choices from unresolved visual, runtime, fallback, publish refresh, editor capability, asset, or handoff gaps. A page SHALL NOT be marked launch-ready solely because a shared shell difference is classified as `protected-product-choice`.

#### Scenario: A protected header choice does not complete a page launch gate

- **WHEN** a launch review records that the shared header or footer differs from the FHD reference but is classified as `protected-product-choice`
- **THEN** the protected shell difference does not count as a visual fail for the protected attributes
- **AND** the launch matrix still evaluates the page's content polish, runtime parity, publish refresh, fallback behavior, and handoff readiness
- **AND** unresolved page-local `actual-gap` decisions keep the relevant launch gate fail or blocked


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
### Requirement: Reference-informed boundary decisions are linked from the authoritative witness matrix

The display launch witness workflow SHALL keep pass, fail, or blocked status in the authoritative witness matrix while allowing each status entry to reference boundary decisions. The witness matrix SHALL identify whether a status depends on a protected product choice, a reference quality target, or an actual gap.

#### Scenario: Launch status points to boundary rationale without creating a second ledger

- **WHEN** Overview, Solar, Factory Circuit, Images, or Sustainability receives a visual launch status update
- **THEN** the witness matrix records the status in the authoritative page row
- **AND** the row references the boundary classification that explains the status rationale
- **AND** supporting boundary documentation does not become a competing launch status ledger

##### Example: Images remains blocked despite protected footer

- **GIVEN** Images has `protected-product-choice` for shared footer position and `actual-gap` for runtime playlist fallback witness
- **WHEN** the Images row is updated in the authoritative witness matrix
- **THEN** the visual rationale can reference the protected footer decision
- **AND** the fallback gate and overall status remain `blocked` until playlist fallback witness passes


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
### Requirement: Five-page closeout uses consistent reference-informed examples

The display launch witness workflow SHALL use consistent reference-informed examples for the five playback pages during closeout. The examples SHALL identify protected shared shell choices separately from page-specific quality targets and actual gaps.

#### Scenario: The five playback pages receive page-specific closeout guidance

- **WHEN** the launch witness matrix or closeout matrix documents reference-informed visual review
- **THEN** Overview guidance distinguishes protected shell choices from hero photo fade, bilingual title rhythm, and KPI row quality targets
- **AND** Solar guidance distinguishes protected shell choices from connector thickness, flow node placement, and KPI row rhythm quality targets
- **AND** Factory Circuit guidance distinguishes protected shell choices from circuit line weight, ornament balance, and load panel display hierarchy quality targets
- **AND** Images guidance distinguishes protected shell choices from media stage crop, thumbnail density, and caption display tension quality targets
- **AND** Sustainability guidance distinguishes protected shell choices from ring ornament integration, hero media overlap, tree/stat rhythm, and highlight rail density quality targets

##### Example: Five-page quality target map

| Page | Protected product choice example | Reference quality target examples |
| ----- | ----- | ----- |
| Overview | Shared header height and position | Hero photo fade, bilingual title rhythm, KPI row spacing |
| Solar | Shared footer height and nav position | Connector thickness, flow node placement, KPI row rhythm |
| Factory Circuit | Shared shell information density | Circuit line weight, ornament balance, load panel hierarchy |
| Images | Shared header/footer position | Media stage crop, thumbnail strip density, caption display tension |
| Sustainability | Shared footer position | Ring ornament integration, hero media overlap, highlight rail density |

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
### Requirement: Consume boundary classification as launch rationale without changing gate semantics

The launch witness workflow SHALL allow the five-page matrix to reference a fresh boundary classification document as status rationale. The referenced classification SHALL NOT replace authoring, runtime parity, publish refresh, fallback, or handoff gates.

#### Scenario: Boundary rationale is recorded while status remains blocked

- **WHEN** a page has a protected shell choice but lacks publish refresh or fallback witness
- **THEN** the matrix records the protected shell choice as rationale
- **AND** the affected launch gate remains `blocked` until its evidence passes
- **AND** the matrix remains the single authoritative status ledger

<!-- @trace
source: capture-fhd-reference-informed-playback-witness-classifications
updated: 2026-06-07
code:
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - data/server-runtime.lock.json
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/images-reference-quality-closeout.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/goal.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/scripts/run-tests.mjs
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - apps/web/package.json
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/Images/layout.ts
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
-->