## ADDED Requirements

### Requirement: Provide a formal display asset generation skill package

The implementation SHALL provide a formal skill package for display wall asset generation so asset planning, prompt recipes, export specs, and preview QA can be reused consistently for the five playback display pages.

#### Scenario: Skill package is available in the repository

- **WHEN** repository skills are inspected
- **THEN** `skills/display-asset-generation/SKILL.md` exists
- **AND** the skill metadata identifies `display-asset-generation` as the skill name
- **AND** the skill describes when to use it, manifest workflow, naming rules, photo workflow, icon workflow, ornament workflow, prompt recipe structure, and preview QA

### Requirement: Provide a dedicated display asset generation agent

The implementation SHALL provide a dedicated Codex agent for display wall asset generation so the formal skill can be applied through the repo's multi-agent workflow.

#### Scenario: Agent is discoverable in Codex config

- **WHEN** Codex multi-agent configuration is loaded
- **THEN** `display_asset_guide` is registered as an available agent
- **AND** its config file describes display asset generation, manifest, prompt recipe, post-process, and preview QA responsibilities
- **AND** it coexists with `frontend_guide` without replacing frontend UX guidance

### Requirement: Require manifest-first asset generation workflow

The implementation SHALL define an asset manifest workflow that records display asset intent, generation recipe, output target, version, status, and QA notes before an asset is treated as approved.

#### Scenario: Asset record captures production-relevant metadata

- **WHEN** a hero photo, gallery photo, icon, ornament, or placeholder asset is proposed for a display page
- **THEN** its manifest record includes page, slot, assetKey, role, format, targetSize, sourceMode, promptRecipe, version, status, and qaNotes
- **AND** approved status is not assigned until preview QA has passed

##### Example: Solar hero asset is traceable

- **GIVEN** a generated solar carport hero photo candidate
- **WHEN** it is added to the asset manifest
- **THEN** the record identifies page `solar`, slot `heroMedia`, role `photo`, expected webp output size, prompt recipe id, version, source mode, and QA status

### Requirement: Provide reusable prompt recipe structure

The implementation SHALL provide prompt recipe documentation that separates shared visual style, page intent, asset role, composition, constraints, and avoid-list guidance.

#### Scenario: Recipes avoid one-off prompt drift

- **WHEN** a user requests new display assets for any of the five playback pages
- **THEN** the asset generation process starts from a reusable prompt recipe
- **AND** the recipe includes shared green-energy display-wall style and page-specific intent
- **AND** avoid-list guidance prevents text, logos, people details, fake UI, low resolution, over-stylization, and inconsistent icon grammar

### Requirement: Separate photo, icon, ornament, and placeholder generation skills

The implementation SHALL document different generation and export workflows for photos, icons, ornaments, and placeholders because each asset class has different quality risks and runtime usage.

#### Scenario: Asset class determines output rules

- **WHEN** the asset role is `photo`
- **THEN** the workflow specifies bitmap output size, color treatment, crop/fade compatibility, and no baked-in text or logo content
- **WHEN** the asset role is `icon`
- **THEN** the workflow specifies final SVG normalization, consistent viewBox, stroke width, and currentColor usage
- **WHEN** the asset role is `ornament`
- **THEN** the workflow specifies token-driven color/opacity and quiet decorative behavior
- **WHEN** the asset role is `placeholder`
- **THEN** the workflow specifies readable fallback treatment that does not compete with content

### Requirement: Require display page preview QA before approval

The implementation SHALL require preview QA inside the actual playback pages before generated assets are marked approved.

#### Scenario: Asset is checked in page context

- **WHEN** an asset candidate is ready for review
- **THEN** it is checked in the relevant display page preview or route
- **AND** shared QA includes `/overview`, `/solar`, `/factory-circuit`, `/images`, `/sustainability`, and `/slideshow-preview` when relevant
- **AND** QA verifies readability, photo fade compatibility, icon family consistency, ornament restraint, and five-page visual family consistency