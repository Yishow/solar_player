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