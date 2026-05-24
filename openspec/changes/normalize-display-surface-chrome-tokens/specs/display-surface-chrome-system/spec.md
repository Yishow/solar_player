## ADDED Requirements

### Requirement: Share semantic display chrome tokens across playback pages

The implementation SHALL provide semantic display-surface tokens for common playback-page visual roles so `Overview`, `Solar`, `FactoryCircuit`, `Images`, and `Sustainability` can share one visual family without duplicating raw page-local color and surface values.

#### Scenario: Playback pages consume display semantic roles

- **WHEN** any of the five playback display pages renders hero typography, card surfaces, photo fades, or ornament colors
- **THEN** those shared visual roles are resolved through semantic display tokens
- **AND** page-local CSS does not introduce new raw color literals for roles already covered by the shared token contract
- **AND** each page keeps its existing FHD geometry and content order

##### Example: Hero title and emphasis use shared display roles

- **GIVEN** a playback page renders a large zh title with an emphasized green or gold word
- **WHEN** the page applies its hero title styles
- **THEN** the title ink and emphasis colors come from display semantic roles
- **AND** the page may still choose whether the emphasis role is green or gold based on its template intent

### Requirement: Share hero typography rhythm while preserving page placement

The implementation SHALL let playback pages use a shared hero typography rhythm for eyebrow, large title, emphasized title segment, and subtitle while preserving each page's current copy, layout region, and editor-controlled typography config.

#### Scenario: Hero typography remains configurable and visually consistent

- **WHEN** a playback page renders its hero copy region
- **THEN** the eyebrow, title, emphasis, and subtitle use the shared display hero rhythm by default
- **AND** existing `chrome.heroTypography` config values remain valid editor-controlled overrides
- **AND** the page does not move the hero copy region to adopt the shared rhythm

### Requirement: Share photo fade and ornament vocabulary

The implementation SHALL provide shared photo fade and ornament treatments for display playback pages so hero images, gallery images, leaf watermarks, and gold lines visually blend into the same warm paper display surface.

#### Scenario: Media and ornaments align across pages

- **WHEN** playback pages render hero media, gallery media, leaf ornaments, or gold lines
- **THEN** photo fades and ornaments use the shared display chrome vocabulary
- **AND** page-specific position, opacity, scale, and direction remain configurable where already supported
- **AND** missing or disabled media/ornaments do not make the page unreadable

##### Example: Hero image fades into paper without hard edges

- **GIVEN** a playback page has a managed or seed-default hero image
- **WHEN** the image renders inside the display surface
- **THEN** the image fades into the warm paper background using shared fade semantics
- **AND** the page keeps its existing media container geometry
