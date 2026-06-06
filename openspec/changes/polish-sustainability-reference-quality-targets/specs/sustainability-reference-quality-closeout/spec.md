## ADDED Requirements

### Requirement: Tune only classified Sustainability reference quality targets

The implementation SHALL tune only Sustainability surfaces classified as `reference-quality-target` in the fresh boundary classification artifact. The implementation SHALL NOT tune surfaces classified as `protected-product-choice` except to verify they remain unchanged.

#### Scenario: Story content is tuned while shell stays protected

- **WHEN** Sustainability reference-quality closeout is applied
- **THEN** page content targets such as hero/ring composition, Trees/stat rhythm, and highlight rail density are eligible for tuning
- **AND** shared header/footer protected attributes remain unchanged

##### Example: Eligible and protected Sustainability rows

| Surface | Classification | Result |
| ----- | ----- | ----- |
| Ring ornament / hero overlap | `reference-quality-target` | Eligible for config tuning |
| Shared footer position | `protected-product-choice` | Verified unchanged |

### Requirement: Preserve Sustainability story playback hierarchy

Sustainability closeout SHALL preserve a playback story hierarchy with hero composition, stat rhythm, and highlight rail pacing. It SHALL NOT replace the page with a generic KPI dashboard, management summary grid, or settings-like card stack.

#### Scenario: Stat cards support the story rather than dominate it

- **WHEN** Trees/stat card rhythm is tuned
- **THEN** the stat cards support the Sustainability story flow and hero composition
- **AND** they do not become the dominant management dashboard on the page

##### Example: Stat rhythm stays story-first

| Target | Required presentation | Rejected presentation |
| ----- | ----- | ----- |
| Trees/stat card rhythm | Story-supporting statistic cadence | Generic management KPI dashboard |

### Requirement: Keep Sustainability closeout editor-maintainable

Sustainability visual tuning SHALL use existing editor-maintainable display page config fields for hero media, ornament presentation, stat cards, highlight rail, card family, and geometry. Treatment needs that cannot be represented by existing fields SHALL be recorded as `actual-gap` instead of implemented as a hardcoded runtime bypass.

#### Scenario: Ring ornament or highlight rail styling exposes a capability gap

- **WHEN** fresh witness proves ring ornament overlap, hero media treatment, or highlight rail density cannot be represented by current fields
- **THEN** the implementation records an `actual-gap` follow-up
- **AND** it does not add page-local CSS-only treatment that cannot be maintained from the editor

##### Example: Ring overlap gap handling

| Witness result | Current fields | Required result |
| ----- | ----- | ----- |
| Reference needs ring/media overlap unavailable in config | No overlap field exists | Record `actual-gap`, do not hardcode CSS transform |

### Requirement: Preserve launch status until full gates pass

Sustainability closeout SHALL NOT mark the page launch-ready unless runtime parity, publish refresh, fallback, and handoff evidence are all present.

#### Scenario: Visual polish does not complete launch readiness

- **WHEN** Sustainability visual witness improves but fallback or publish refresh evidence remains missing
- **THEN** the launch matrix remains `blocked` for the missing gate
- **AND** the evidence notes record the visual closeout result separately from launch status

##### Example: Visual closeout does not override launch gate

| Route | Visual result | Missing gate | Launch matrix result |
| ----- | ----- | ----- | ----- |
| `/sustainability` | Hero/ring witness improved | Publish refresh witness | Overall remains `blocked` |
