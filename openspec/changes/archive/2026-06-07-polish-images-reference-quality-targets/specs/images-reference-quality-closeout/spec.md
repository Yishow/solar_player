## ADDED Requirements

### Requirement: Tune only classified Images reference quality targets

The implementation SHALL tune only Images surfaces classified as `reference-quality-target` in the fresh boundary classification artifact. The implementation SHALL NOT tune surfaces classified as `protected-product-choice` except to verify they remain unchanged.

#### Scenario: Media content is tuned while shell stays protected

- **WHEN** Images reference-quality closeout is applied
- **THEN** page content targets such as media stage crop, thumbnail strip density, and caption hierarchy are eligible for tuning
- **AND** shared header/footer protected attributes remain unchanged

##### Example: Eligible and protected Images rows

| Surface | Classification | Result |
| ----- | ----- | ----- |
| Media stage crop | `reference-quality-target` | Eligible for config tuning |
| Shared header height | `protected-product-choice` | Verified unchanged |

### Requirement: Preserve Images playback media hierarchy

Images closeout SHALL preserve a playback media-stage hierarchy with primary media dominant over thumbnails and captions. It SHALL NOT replace the page with an image-management grid, upload panel, asset browser, or settings-like card stack.

#### Scenario: Thumbnail strip remains subordinate to the primary media

- **WHEN** thumbnail strip density is tuned
- **THEN** thumbnails support the primary media stage and maintain display rhythm
- **AND** they do not become the dominant management grid on the page

##### Example: Thumbnail strip stays subordinate

| Target | Required presentation | Rejected presentation |
| ----- | ----- | ----- |
| Thumbnail strip | Compact support rail under primary media | Dominant asset-management grid |

### Requirement: Keep Images closeout editor-maintainable

Images visual tuning SHALL use existing editor-maintainable display page config fields for media presentation, thumbnail treatment, caption typography, card family, and geometry. Treatment needs that cannot be represented by existing fields SHALL be recorded as `actual-gap` instead of implemented as a hardcoded runtime bypass.

#### Scenario: Media crop or caption styling exposes a capability gap

- **WHEN** fresh witness proves media crop, thumbnail density, or caption styling cannot be represented by current fields
- **THEN** the implementation records an `actual-gap` follow-up
- **AND** it does not add page-local CSS-only treatment that cannot be maintained from the editor

##### Example: Media crop gap handling

| Witness result | Current fields | Required result |
| ----- | ----- | ----- |
| Reference needs per-image focal crop unavailable in config | No focal crop field exists | Record `actual-gap`, do not hardcode CSS object-position |

### Requirement: Preserve launch status until full gates pass

Images closeout SHALL NOT mark the page launch-ready unless runtime parity, publish refresh, fallback, and handoff evidence are all present.

#### Scenario: Visual polish does not complete launch readiness

- **WHEN** Images visual witness improves but fallback or publish refresh evidence remains missing
- **THEN** the launch matrix remains `blocked` for the missing gate
- **AND** the evidence notes record the visual closeout result separately from launch status

##### Example: Visual closeout does not override launch gate

| Route | Visual result | Missing gate | Launch matrix result |
| ----- | ----- | ----- | ----- |
| `/images` | Media/caption witness improved | Fallback witness | Overall remains `blocked` |
