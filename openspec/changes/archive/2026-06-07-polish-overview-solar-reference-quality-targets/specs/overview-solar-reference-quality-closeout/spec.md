## ADDED Requirements

### Requirement: Tune only classified Overview and Solar reference quality targets

The implementation SHALL tune only Overview and Solar surfaces classified as `reference-quality-target` in the fresh boundary classification artifact. The implementation SHALL NOT tune surfaces classified as `protected-product-choice` except to verify they remain unchanged.

#### Scenario: Page content is tuned while shell stays protected

- **WHEN** Overview and Solar reference-quality closeout is applied
- **THEN** page content targets such as Overview hero/KPI rhythm and Solar flow/KPI rhythm are eligible for tuning
- **AND** shared header/footer protected attributes remain unchanged

##### Example: Eligible and protected Overview/Solar rows

| Route | Surface | Classification | Result |
| ----- | ----- | ----- | ----- |
| `/overview` | Hero photo fade | `reference-quality-target` | Eligible for config tuning |
| `/solar` | Footer position | `protected-product-choice` | Verified unchanged |

### Requirement: Keep Overview closeout editor-maintainable

Overview visual tuning SHALL use existing editor-maintainable display page config fields for hero typography, hero media presentation, summary/KPI card style, and geometry. It SHALL NOT introduce page-local hardcoded runtime values outside the existing config path.

#### Scenario: Overview runtime still reads resolved display config

- **WHEN** Overview closeout updates hero or KPI presentation
- **THEN** the runtime continues to render from the resolved display page config
- **AND** focused tests cover the changed config fields or seed values

##### Example: Overview hero and KPI fields stay config-backed

| Target | Allowed path | Disallowed path |
| ----- | ----- | ----- |
| Hero media fade | `Overview/displayPageConfig.ts` seed/config field | Page-local hardcoded runtime constant |
| KPI card height | Existing resolved display config field | Shared shell CSS override |

### Requirement: Keep Solar closeout editor-maintainable

Solar visual tuning SHALL use existing editor-maintainable display page config fields for flow nodes, connectors, KPI cards, icon sources, and geometry. Connector or node treatment needs that cannot be represented by existing fields SHALL be recorded as `actual-gap` instead of implemented as a hardcoded runtime bypass.

#### Scenario: Solar connector treatment exposes a capability gap instead of a bypass

- **WHEN** fresh witness proves connector stroke or cap treatment cannot be represented by current connector fields
- **THEN** the implementation records an `actual-gap` follow-up
- **AND** it does not add page-local CSS-only treatment that cannot be maintained from the editor

##### Example: Solar connector gap handling

| Witness result | Current fields | Required result |
| ----- | ----- | ----- |
| Reference uses a connector cap unavailable in config | No cap field exists | Record `actual-gap`, do not hardcode CSS cap |

### Requirement: Preserve launch status until full gates pass

Overview and Solar closeout SHALL NOT mark either page launch-ready unless runtime parity, publish refresh, fallback, and handoff evidence are all present.

#### Scenario: Visual polish does not complete launch readiness

- **WHEN** Overview or Solar visual witness improves but fallback or publish refresh evidence remains missing
- **THEN** the launch matrix remains `blocked` for the missing gate
- **AND** the evidence notes record the visual closeout result separately from launch status

##### Example: Visual closeout does not override launch gate

| Route | Visual result | Missing gate | Launch matrix result |
| ----- | ----- | ----- | ----- |
| `/overview` | Hero/KPI witness improved | Fallback witness | Overall remains `blocked` |
