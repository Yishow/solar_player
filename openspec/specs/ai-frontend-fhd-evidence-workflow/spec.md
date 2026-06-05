# ai-frontend-fhd-evidence-workflow Specification

## Purpose

Define the evidence-driven workflow AI authors must follow before reviewing FHD-affecting frontend changes.

## Requirements

### Requirement: Require witness-batch evidence for FHD-affecting frontend changes

The workflow SHALL require an evidence bundle whenever an AI-authored change affects playback visuals, shared display chrome, integrated editor workspaces, or management pages that participate in the FHD witness set. The evidence bundle SHALL identify the witness batch, affected surface family, protected visual attributes, exceptions, and verification pack.

#### Scenario: AI-authored playback visual change prepares an evidence bundle

- **WHEN** an AI-authored change modifies playback visuals or shared display chrome
- **THEN** the change includes an evidence bundle before review completion
- **AND** the evidence bundle names the witness batch, affected surfaces, protected attributes, exceptions, and verification steps

##### Example: Solar and Overview witness batch is declared explicitly

- **GIVEN** an AI-authored change updates `/overview` and `/solar`
- **WHEN** the change is proposed or reviewed
- **THEN** the evidence bundle identifies the playback witness batch for those two pages
- **AND** it records which hero, KPI, chrome, or geometry attributes are protected in that batch

<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-05-27
code:
  - openspec/specs/ai-frontend-fhd-evidence-workflow/spec.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-surface-split-guide.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .codex/hooks.json
  - .codex/hooks/fhd-evidence-reminder.js
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
-->


<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-05-27
code:
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/app/router.tsx
  - docs/README.md
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - docs/reference-match/display-launch-verification-pack.md
  - apps/server/src/app.ts
  - docs/reference-match/all-pages-checklist.md
  - .agents/skills/display-asset-generation/SKILL.md
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - AGENTS.md
  - apps/web/src/pages/shared/displayPageRouteHost.css
  - docs/reference-match/fhd-workflow-entrypoints.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/components/AppFooterNav.tsx
  - docs/reference-match/fhd-exception-ledger-template.md
  - README.md
  - docs/reference-match/playback-visual-canonicals.md
  - apps/web/src/layouts/shellBootstrap.ts
  - CLAUDE.md
  - .codex/hooks/fhd-evidence-reminder.js
  - docs/reference-match/all-pages-audit.md
  - .codex/hooks.json
  - docs/reference-match/fhd-surface-split-guide.md
  - .agents/skills/display-asset-generation/README.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/FHD.01.html
  - apps/server/src/mqtt/MqttClientService.ts
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
-->

<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-06-05
code:
  - apps/web/src/styles/global.css
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - .agents/skills/spectra-verify/SKILL.md
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
-->

---
### Requirement: Split FHD work by surface family and reviewable scope

The workflow SHALL require AI-authored FHD work to declare a reviewable surface family and scope boundary before implementation. A single change SHALL NOT silently mix playback visual canonicals, management panel alignment, editor workspace styling, runtime data rewiring, and geometry movement without an explicit split or justification.

#### Scenario: A broad AI change is decomposed before implementation

- **WHEN** an AI-authored change touches multiple high-risk FHD concerns
- **THEN** the workflow decomposes the work into separate witness batches or separate changes
- **AND** each batch records its own protected contracts and verification target

##### Example: Visual and runtime concerns do not share one unbounded change

- **GIVEN** a request mentions playback polish, editor alignment, and launch readiness
- **WHEN** the AI prepares Spectra artifacts
- **THEN** the work is split into separate reviewable scopes rather than one unbounded frontend change
- **AND** each scope names its own evidence and verification pack

<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-05-27
code:
  - openspec/specs/ai-frontend-fhd-evidence-workflow/spec.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-surface-split-guide.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .codex/hooks.json
  - .codex/hooks/fhd-evidence-reminder.js
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
-->


<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-05-27
code:
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/app/router.tsx
  - docs/README.md
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - docs/reference-match/display-launch-verification-pack.md
  - apps/server/src/app.ts
  - docs/reference-match/all-pages-checklist.md
  - .agents/skills/display-asset-generation/SKILL.md
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - AGENTS.md
  - apps/web/src/pages/shared/displayPageRouteHost.css
  - docs/reference-match/fhd-workflow-entrypoints.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/components/AppFooterNav.tsx
  - docs/reference-match/fhd-exception-ledger-template.md
  - README.md
  - docs/reference-match/playback-visual-canonicals.md
  - apps/web/src/layouts/shellBootstrap.ts
  - CLAUDE.md
  - .codex/hooks/fhd-evidence-reminder.js
  - docs/reference-match/all-pages-audit.md
  - .codex/hooks.json
  - docs/reference-match/fhd-surface-split-guide.md
  - .agents/skills/display-asset-generation/README.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/FHD.01.html
  - apps/server/src/mqtt/MqttClientService.ts
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
-->

<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-06-05
code:
  - apps/web/src/styles/global.css
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - .agents/skills/spectra-verify/SKILL.md
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
-->

---
### Requirement: Record FHD exceptions as durable review artifacts

The workflow SHALL record any intentional deviation from the witness set or playback visual canonicals in an exception ledger. The exception ledger SHALL identify the affected page or surface, the reason for deviation, the expected user-visible effect, and the residual risk.

#### Scenario: A deviation from the witness set is documented

- **WHEN** an AI-authored change cannot preserve a witness attribute exactly
- **THEN** the exception ledger records the affected surface, the reason, the alternative behavior, and the residual risk
- **AND** the deviation does not remain an undocumented local optimization

##### Example: Operator readability wins over a reference spacing value

- **GIVEN** a management witness page requires slightly looser spacing to keep a control readable
- **WHEN** the AI keeps the readable layout instead of matching the witness exactly
- **THEN** the exception ledger records that spacing deviation and its operator-readability rationale
- **AND** reviewers can distinguish an intentional exception from accidental drift

<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-05-27
code:
  - openspec/specs/ai-frontend-fhd-evidence-workflow/spec.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-surface-split-guide.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .codex/hooks.json
  - .codex/hooks/fhd-evidence-reminder.js
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
-->

<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-05-27
code:
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/app/router.tsx
  - docs/README.md
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - docs/reference-match/display-launch-verification-pack.md
  - apps/server/src/app.ts
  - docs/reference-match/all-pages-checklist.md
  - .agents/skills/display-asset-generation/SKILL.md
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - AGENTS.md
  - apps/web/src/pages/shared/displayPageRouteHost.css
  - docs/reference-match/fhd-workflow-entrypoints.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/components/AppFooterNav.tsx
  - docs/reference-match/fhd-exception-ledger-template.md
  - README.md
  - docs/reference-match/playback-visual-canonicals.md
  - apps/web/src/layouts/shellBootstrap.ts
  - CLAUDE.md
  - .codex/hooks/fhd-evidence-reminder.js
  - docs/reference-match/all-pages-audit.md
  - .codex/hooks.json
  - docs/reference-match/fhd-surface-split-guide.md
  - .agents/skills/display-asset-generation/README.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/FHD.01.html
  - apps/server/src/mqtt/MqttClientService.ts
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
-->

<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-06-05
code:
  - apps/web/src/styles/global.css
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - .agents/skills/spectra-verify/SKILL.md
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
-->

---
### Requirement: Record reference-informed boundary decisions in FHD evidence bundles

The FHD evidence workflow SHALL require evidence bundles for FHD closeout work to record reference-informed boundary decisions for material reference differences. The evidence bundle SHALL include a boundary decision table with Surface, Classification, Current Product Choice, Reference Quality Cue, Gap Type, Protected Attributes, Implementation Consequence, Verification Gate, Witness Evidence, Accepted By, and Revisit Trigger fields.

#### Scenario: Evidence separates protected shell choices from page polish targets

- **WHEN** an AI-authored FHD closeout change affects shared display chrome and playback page content
- **THEN** the evidence bundle records boundary decisions for material reference differences
- **AND** accepted header or footer height, position, or information density can be classified as `protected-product-choice`
- **AND** page content polish such as hero hierarchy, KPI rhythm, flow clarity, media density, caption tension, ornament balance, or highlight rail density remains separately classified as `reference-quality-target` or `actual-gap`

##### Example: Required evidence fields for each classification

| Classification | Required fields |
| ----- | ----- |
| `protected-product-choice` | Surface, Classification, Current Product Choice, Protected Attributes, Witness Evidence, Accepted By, Revisit Trigger |
| `reference-quality-target` | Surface, Classification, Reference Quality Cue, Implementation Consequence, Witness Evidence |
| `actual-gap` | Surface, Classification, Gap Type, Implementation Consequence, Verification Gate, Witness Evidence, Revisit Trigger |


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
### Requirement: Treat incomplete boundary evidence as incomplete FHD evidence

The FHD evidence workflow SHALL treat missing classification, missing protected attributes, missing witness evidence, or missing accepted-by owner for a protected product choice as incomplete evidence. The workflow SHALL also treat an `actual-gap` row with missing Gap Type, missing Verification Gate, missing Witness Evidence, or missing Revisit Trigger as incomplete evidence. Incomplete boundary evidence SHALL NOT be used to waive a visual guardrail or mark a launch witness gate as pass.

#### Scenario: A protected choice without owner evidence does not waive review

- **WHEN** an evidence bundle claims that a shared shell difference is accepted but omits the accepted-by owner or protected attributes
- **THEN** the evidence bundle remains incomplete for FHD closeout review
- **AND** an `actual-gap` row that omits Gap Type, Verification Gate, Witness Evidence, or Revisit Trigger also remains incomplete for launch closeout review
- **AND** the difference cannot waive visual review until the missing evidence is recorded
- **AND** the related launch witness gate remains fail or blocked when the missing evidence affects launch readiness

##### Example: Missing accepted-by owner

- **GIVEN** an evidence bundle row has Surface `Shared footer`, Classification `protected-product-choice`, Protected Attributes `height and bottom position`, and Accepted By empty
- **WHEN** the reviewer evaluates the row
- **THEN** the row is incomplete boundary evidence
- **AND** the footer difference cannot be used to waive the visual guardrail until Accepted By is recorded

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