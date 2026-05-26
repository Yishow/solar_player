# agent-and-doc-entrypoint-alignment Specification

## Purpose

Keep agent-facing and human-facing entrypoints aligned to the same FHD and display workflow without duplicating the full workflow specs.

## Requirements

### Requirement: Keep agent-facing entrypoints aligned to one display workflow

The repository SHALL keep `AGENTS.md`, `CLAUDE.md`, and relevant repo-local skill entrypoints aligned to the same FHD and display workflow vocabulary. Agent-facing entrypoints SHALL NOT describe conflicting workflow expectations for witness batches, evidence bundles, or launch witness gates.

#### Scenario: An agent can start from either AGENTS or CLAUDE

- **WHEN** an agent reads `AGENTS.md` or `CLAUDE.md` before working on FHD or display changes
- **THEN** both entrypoints direct the agent to the same workflow expectations
- **AND** neither file introduces a conflicting path for playback visual review or launch readiness work

##### Example: Both entrypoints mention the same launch workflow

- **GIVEN** the repo has formal FHD visual canonicals, evidence workflow, and launch witness gates
- **WHEN** an agent starts from either `AGENTS.md` or `CLAUDE.md`
- **THEN** the agent sees the same high-level workflow
- **AND** the entrypoint does not depend on one file containing newer rules than the other

<!-- @trace
source: align-agent-and-doc-entrypoints-with-fhd-workflow
updated: 2026-05-27
code:
  - AGENTS.md
  - CLAUDE.md
  - README.md
  - docs/README.md
  - .agents/skills/display-asset-generation/SKILL.md
  - .agents/skills/display-asset-generation/README.md
  - .agents/skills/product-gap-audit/SKILL.md
  - docs/reference-match/fhd-workflow-entrypoints.md
  - openspec/specs/agent-and-doc-entrypoint-alignment/spec.md
tests:
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
-->

---
### Requirement: Keep human-facing entrypoints lightweight and navigable

The repository SHALL keep `README.md` and `docs/README.md` lightweight while still directing readers to the canonical FHD and display workflow sources. Human-facing entrypoints SHALL identify where to find reference images, reference-match docs, workflow entrypoint guides, and launch witness materials.

#### Scenario: A developer can find the right display workflow documents from README

- **WHEN** a developer reads `README.md` or `docs/README.md`
- **THEN** they can locate the canonical FHD and display workflow documents without searching the repo blindly
- **AND** the README files do not attempt to duplicate the full workflow specification inline

##### Example: README points to reference-match instead of restating the whole workflow

- **GIVEN** a developer needs to work on FHD playback quality
- **WHEN** they start from the root `README.md`
- **THEN** the README points them to the relevant `docs/reference-match/` and `openspec/` entrypoints
- **AND** the detailed workflow remains in the canonical documents rather than being duplicated in the README

<!-- @trace
source: align-agent-and-doc-entrypoints-with-fhd-workflow
updated: 2026-05-27
code:
  - AGENTS.md
  - CLAUDE.md
  - README.md
  - docs/README.md
  - .agents/skills/display-asset-generation/SKILL.md
  - .agents/skills/display-asset-generation/README.md
  - .agents/skills/product-gap-audit/SKILL.md
  - docs/reference-match/fhd-workflow-entrypoints.md
  - openspec/specs/agent-and-doc-entrypoint-alignment/spec.md
tests:
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
-->

---
### Requirement: Repo-local skills use the same workflow vocabulary as the entrypoints

The repository SHALL keep repo-local skill entrypoints aligned to the same workflow vocabulary used by agent-facing and human-facing entrypoints. Skills that direct display or FHD work SHALL use the same terms for witness batches, evidence bundles, visual canonicals, and launch witness gates.

#### Scenario: A repo-local skill reinforces the same workflow

- **WHEN** an agent triggers a repo-local skill related to display or FHD work
- **THEN** the skill reinforces the same workflow vocabulary used by the repository entrypoints
- **AND** the skill does not silently introduce an alternate naming scheme or missing step

##### Example: Display asset skill uses the same witness terminology

- **GIVEN** an agent triggers the repo-local display asset skill for a playback polish request
- **WHEN** the skill explains how to proceed
- **THEN** it uses the same terms for witness batches, evidence bundles, and launch witness gates as the repository entrypoints
- **AND** it does not replace those terms with an incompatible local shorthand

<!-- @trace
source: align-agent-and-doc-entrypoints-with-fhd-workflow
updated: 2026-05-27
code:
  - AGENTS.md
  - CLAUDE.md
  - README.md
  - docs/README.md
  - .agents/skills/display-asset-generation/SKILL.md
  - .agents/skills/display-asset-generation/README.md
  - .agents/skills/product-gap-audit/SKILL.md
  - docs/reference-match/fhd-workflow-entrypoints.md
  - openspec/specs/agent-and-doc-entrypoint-alignment/spec.md
tests:
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
-->
