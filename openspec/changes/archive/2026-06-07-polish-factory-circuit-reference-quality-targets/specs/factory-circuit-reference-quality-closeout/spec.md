## ADDED Requirements

### Requirement: Tune only classified Factory Circuit reference quality targets

The implementation SHALL tune only Factory Circuit surfaces classified as `reference-quality-target` in the fresh boundary classification artifact. The implementation SHALL NOT tune surfaces classified as `protected-product-choice` except to verify they remain unchanged.

#### Scenario: Circuit content is tuned while shell stays protected

- **WHEN** Factory Circuit reference-quality closeout is applied
- **THEN** page content targets such as circuit routing, line weight, ornament treatment, and load panel hierarchy are eligible for tuning
- **AND** shared header/footer protected attributes remain unchanged

##### Example: Eligible and protected Factory Circuit rows

| Surface | Classification | Result |
| ----- | ----- | ----- |
| Circuit line weight | `reference-quality-target` | Eligible for config tuning |
| Shared footer position | `protected-product-choice` | Verified unchanged |

### Requirement: Preserve Factory Circuit display language

Factory Circuit closeout SHALL preserve source-like circuit routing, factory icon vocabulary, and playback display hierarchy. It SHALL NOT replace circuit/load presentation with a table-first management panel, generic dashboard card stack, or settings-like glass surface.

#### Scenario: Load presentation remains a playback surface

- **WHEN** the load panel hierarchy is tuned
- **THEN** the result emphasizes display hierarchy, source/load relationship, and visual rhythm
- **AND** it does not become a CRUD-style table or management summary grid

##### Example: Load hierarchy remains display-first

| Target | Required presentation | Rejected presentation |
| ----- | ----- | ----- |
| Load panel | Source/load relationship with visual rhythm | CRUD-style table with management controls |

### Requirement: Keep Factory Circuit closeout editor-maintainable

Factory Circuit visual tuning SHALL use existing editor-maintainable display page config fields for circuit layout, connector treatment, ornament presentation, card family, and geometry. Treatment needs that cannot be represented by existing fields SHALL be recorded as `actual-gap` instead of implemented as a hardcoded runtime bypass.

#### Scenario: Ornament or connector treatment exposes a capability gap

- **WHEN** fresh witness proves ornament scale, ornament opacity, connector stroke, or connector cap treatment cannot be represented by current fields
- **THEN** the implementation records an `actual-gap` follow-up
- **AND** it does not add page-local CSS-only treatment that cannot be maintained from the editor

##### Example: Ornament control gap handling

| Witness result | Current fields | Required result |
| ----- | ----- | ----- |
| Reference needs lower leaf ornament opacity | No ornament opacity field exists | Record `actual-gap`, do not hardcode CSS opacity |

### Requirement: Preserve launch status until full gates pass

Factory Circuit closeout SHALL NOT mark the page launch-ready unless runtime parity, publish refresh, fallback, and handoff evidence are all present.

#### Scenario: Visual polish does not complete launch readiness

- **WHEN** Factory Circuit visual witness improves but fallback or publish refresh evidence remains missing
- **THEN** the launch matrix remains `blocked` for the missing gate
- **AND** the evidence notes record the visual closeout result separately from launch status

##### Example: Visual closeout does not override launch gate

| Route | Visual result | Missing gate | Launch matrix result |
| ----- | ----- | ----- | ----- |
| `/factory-circuit` | Circuit/load witness improved | Publish refresh witness | Overall remains `blocked` |
