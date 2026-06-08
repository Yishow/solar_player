## ADDED Requirements

> Implementation note: These requirements are satisfied by the existing hero media capability rather than a separate `backgroundPlacement` config. Band height maps to `heroContainer.height` (the `overview-hero-media` editor region geometry), horizontal/vertical object position map to `heroMedia.alignX`/`heroMedia.alignY` (applied inline via the media presentation), and the bottom fade maps to `heroMedia.effects` (the media effect surface, whose seed already carries a bottom fade layer). The original `inset: 0` full-bleed rule no longer exists; the photo renders through the positioned `.overview-hero-banner` element. Coverage is guarded by `apps/web/src/pages/Overview/backgroundPlacement.test.ts`.

### Requirement: Author Overview background placement

The system SHALL expose editable Overview background placement through the existing hero media authoring contract. Band height SHALL be authored through `heroContainer.height`, horizontal and vertical object position SHALL be authored through `heroMedia.alignX` and `heroMedia.alignY`, and the bottom fade SHALL be authored through `heroMedia.effects`. These fields SHALL be editable in the `/display-pages/editor` Overview inspector and SHALL persist through the existing draft/live mechanism. This contract SHALL apply to the existing background pool photo and SHALL NOT remove or replace the background candidate pool.

#### Scenario: Inspector exposes hero media placement fields

- **WHEN** an operator selects the Overview background in `/display-pages/editor`
- **THEN** the inspector presents editable fields for `heroContainer.height`, object position X, object position Y, and the bottom fade controls on the media effect surface

#### Scenario: Edited background placement persists to draft

- **WHEN** an operator changes a background placement field and saves the draft
- **THEN** the change is persisted to the draft config and reflected when the Overview draft renders

### Requirement: Render Overview background from placement config replacing the hardcoded full-bleed rule

The Overview runtime SHALL apply background placement through the existing hero media presentation path, replacing the retired hardcoded full-bleed inset rule. When the authored hero container height is less than the full canvas height, the background SHALL occupy only the upper band and fade toward its bottom edge per the configured media effect, so the KPI cards and density widgets render over the light page background rather than over the photo.

#### Scenario: Reduced band height confines the photo to the top

- **WHEN** the Overview renders with a background band height less than full canvas height
- **THEN** the photo occupies only the upper band and fades out toward its bottom edge, and the cards below render over the light page background

#### Scenario: Seed hero placement preserves the current appearance

- **WHEN** the Overview renders with the seeded `heroContainer` geometry, `heroMedia.alignX`/`alignY`, and seeded bottom fade layer
- **THEN** the background renders with the same band size, object position, and fade treatment as the current Overview appearance

### Requirement: Seed background placement default preserves current appearance

The seed default for Overview background placement SHALL equal the current hero media appearance so that, before any draft edit, the Overview background is unchanged by introducing these controls.

#### Scenario: No draft edit leaves background unchanged

- **WHEN** the Overview renders with the seed background placement default and no draft edits
- **THEN** the background renders full-bleed exactly as before this capability was added
