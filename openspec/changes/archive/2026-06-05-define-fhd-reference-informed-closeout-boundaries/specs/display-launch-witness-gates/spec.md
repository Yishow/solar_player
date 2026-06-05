## ADDED Requirements

### Requirement: Distinguish protected choices from unresolved gaps in launch witness status

The display launch witness workflow SHALL distinguish accepted protected product choices from unresolved visual, runtime, fallback, publish refresh, editor capability, asset, or handoff gaps. A page SHALL NOT be marked launch-ready solely because a shared shell difference is classified as `protected-product-choice`.

#### Scenario: A protected header choice does not complete a page launch gate

- **WHEN** a launch review records that the shared header or footer differs from the FHD reference but is classified as `protected-product-choice`
- **THEN** the protected shell difference does not count as a visual fail for the protected attributes
- **AND** the launch matrix still evaluates the page's content polish, runtime parity, publish refresh, fallback behavior, and handoff readiness
- **AND** unresolved page-local `actual-gap` decisions keep the relevant launch gate fail or blocked

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
