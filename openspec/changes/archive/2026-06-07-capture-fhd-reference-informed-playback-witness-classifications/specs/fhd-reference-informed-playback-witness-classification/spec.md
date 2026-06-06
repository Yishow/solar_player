## ADDED Requirements

### Requirement: Capture a five-page reference-informed witness batch before tuning

The workflow SHALL capture or explicitly block a fresh FHD witness batch for Overview, Solar, Factory Circuit, Images, and Sustainability before page-specific reference-quality tuning begins. The batch SHALL include each route, FHD reference image, playback screenshot target, editor preview target, and capture result.

#### Scenario: Five playback pages receive fresh witness records

- **WHEN** FHD reference-informed playback closeout begins
- **THEN** the evidence includes witness records for `/overview`, `/solar`, `/factory-circuit`, `/images`, and `/sustainability`
- **AND** each record identifies the FHD reference image and the playback/editor witness path or a concrete capture blocker

### Requirement: Classify each material reference mismatch in one boundary table

The workflow SHALL record material reference mismatches in a boundary decision table before downstream page closeout changes are applied. Each row SHALL use one classification token from `protected-product-choice`, `reference-quality-target`, or `actual-gap`.

#### Scenario: Shell choices and page content targets are separated

- **WHEN** a route has an accepted shared shell difference and unresolved page content polish
- **THEN** the shell difference is recorded as `protected-product-choice` with bounded Protected Attributes
- **AND** the page content polish is recorded separately as `reference-quality-target` or `actual-gap`
- **AND** downstream page changes reference the row they are implementing

##### Example: Overview classification input

| Surface | Classification | Implementation consequence |
| ----- | ----- | ----- |
| Shared header | `protected-product-choice` | Preserve accepted height and position |
| Overview hero photo fade | `reference-quality-target` | Tune hero media integration without pixel matching |
| Overview fallback witness | `actual-gap` | Keep gate blocked until fallback witness passes |

### Requirement: Preserve launch blocked status until launch gates pass

The classification evidence SHALL NOT mark any playback page launch-ready by itself. The authoritative launch witness matrix SHALL remain blocked for any page missing runtime parity, publish refresh, fallback, or handoff evidence.

#### Scenario: Classification rationale does not become launch readiness

- **WHEN** the witness classification records a protected header or footer choice
- **THEN** the launch matrix references that choice as visual rationale
- **AND** the page remains fail or blocked when launch gate evidence is missing

##### Example: Solar protected footer with missing publish evidence

| Route | Classification row | Missing gate | Matrix result |
| ----- | ----- | ----- | ----- |
| `/solar` | Footer position is `protected-product-choice` | Publish refresh witness | Overall remains `blocked` |
