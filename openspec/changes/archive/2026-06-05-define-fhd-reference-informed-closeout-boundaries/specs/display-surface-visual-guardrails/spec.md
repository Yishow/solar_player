## ADDED Requirements

### Requirement: Review intentional reference differences as scoped boundary decisions

The display surface visual guardrails SHALL require intentional reference differences to be reviewed as scoped boundary decisions. A visual review checklist item SHALL NOT accept an intentional deviation unless the decision records a classification token, protected scope or quality cue, witness evidence, and implementation consequence.

#### Scenario: Visual review accepts an intentional shell difference only within scope

- **WHEN** a playback visual review identifies that the current shared header or footer differs from the FHD reference
- **THEN** the checklist records whether the difference is `protected-product-choice`, `reference-quality-target`, or `actual-gap`
- **AND** a protected shell decision records the exact shell attributes being protected
- **AND** visual review still evaluates page content attributes not covered by the protected shell decision

### Requirement: Preserve reference-inspired visual language without management-surface drift

The display surface visual guardrails SHALL keep playback closeout focused on display-wall visual language when a reference difference is classified as `reference-quality-target`. The checklist SHALL require reviewers to identify the quality cue being pursued and SHALL reject generic management-surface substitutions for flow, circuit, icon, card, media, ornament, or rail treatments that need source-like display presentation.

#### Scenario: A page quality target avoids generic management components

- **WHEN** Solar flow, Factory Circuit circuit lines, Images media stage, or Sustainability highlight rail is classified as `reference-quality-target`
- **THEN** the visual review records the relevant reference quality cue
- **AND** the implementation consequence keeps the playback surface display-oriented rather than replacing it with table-first, toolbar-first, or settings-like panel treatments
- **AND** the review preserves any separately protected shared header or footer choice

### Requirement: Boundary vocabulary is testable through lightweight assertions

The display surface visual guardrails SHALL expose enough stable documentation structure for lightweight tests or assertions to verify the boundary vocabulary. The assertions SHALL cover the three classification tokens, the required boundary decision fields, and at least one protected shell example without requiring screenshot diff infrastructure.

#### Scenario: Documentation contract tests detect missing boundary vocabulary

- **WHEN** the visual review checklist or boundary documentation is changed
- **THEN** existing web test workflows can assert that `protected-product-choice`, `reference-quality-target`, and `actual-gap` remain documented
- **AND** the tests can assert that the boundary decision fields remain present
- **AND** the tests do not require an external visual snapshot service
