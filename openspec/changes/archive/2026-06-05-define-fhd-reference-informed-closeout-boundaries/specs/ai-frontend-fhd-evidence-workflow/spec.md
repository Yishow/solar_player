## ADDED Requirements

### Requirement: Record reference-informed boundary decisions in FHD evidence bundles

The FHD evidence workflow SHALL require evidence bundles for FHD closeout work to record reference-informed boundary decisions for material reference differences. The evidence bundle SHALL include a boundary decision table with Surface, Classification, Current Product Choice, Reference Quality Cue, Protected Attributes, Implementation Consequence, Witness Evidence, Accepted By, and Revisit Trigger fields.

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
| `actual-gap` | Surface, Classification, Implementation Consequence, Witness Evidence, Revisit Trigger |

### Requirement: Treat incomplete boundary evidence as incomplete FHD evidence

The FHD evidence workflow SHALL treat missing classification, missing protected attributes, missing witness evidence, or missing accepted-by owner for a protected product choice as incomplete evidence. Incomplete boundary evidence SHALL NOT be used to waive a visual guardrail or mark a launch witness gate as pass.

#### Scenario: A protected choice without owner evidence does not waive review

- **WHEN** an evidence bundle claims that a shared shell difference is accepted but omits the accepted-by owner or protected attributes
- **THEN** the evidence bundle remains incomplete for FHD closeout review
- **AND** the difference cannot waive visual review until the missing evidence is recorded
- **AND** the related launch witness gate remains fail or blocked when the missing evidence affects launch readiness

##### Example: Missing accepted-by owner

- **GIVEN** an evidence bundle row has Surface `Shared footer`, Classification `protected-product-choice`, Protected Attributes `height and bottom position`, and Accepted By empty
- **WHEN** the reviewer evaluates the row
- **THEN** the row is incomplete boundary evidence
- **AND** the footer difference cannot be used to waive the visual guardrail until Accepted By is recorded
