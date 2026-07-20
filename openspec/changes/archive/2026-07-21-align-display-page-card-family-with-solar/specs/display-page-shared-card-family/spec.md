## ADDED Requirements

### Requirement: Share a Solar-derived metric card skeleton across display monitoring pages

The implementation SHALL let `Solar`, `Overview`, and `Sustainability` render KPI or stat cards through a shared metric-card family that preserves the existing FHD card geometry while aligning frame, header, icon, value row, and footer rhythm to the `Solar` playback card baseline.

#### Scenario: Overview and Sustainability adopt the Solar card skeleton

- **WHEN** `/overview` KPI cards or `/sustainability` KPI/stat cards render their monitoring content
- **THEN** each card uses the shared metric-card family instead of a page-local one-off skeleton
- **AND** the card keeps its current `left`, `top`, `width`, `height`, and information density
- **AND** page-specific footer content such as sparklines, growth notes, or narrative blocks remains supported

##### Example: Overview keeps its sparkline while adopting the shared card frame

- **GIVEN** the Overview page already renders five KPI cards with sparkline footers
- **WHEN** the shared metric-card family is applied
- **THEN** each KPI card keeps the same count and FHD placement
- **AND** the sparkline still renders in the footer slot
- **AND** the frame, header, and value row follow the Solar-derived card rhythm

### Requirement: Share an info-card family for compact summary and metadata cards

The implementation SHALL provide a shared info-card family for compact display cards such as the `Overview` summary card and the `Images` metadata card, while preserving each card's current content mode and page-local footprint.

#### Scenario: Summary and metadata cards align without becoming KPI cards

- **WHEN** `/overview` renders its shared-story summary or `/images` renders its active-slide metadata card
- **THEN** each surface uses the shared info-card family for frame, icon/title rhythm, body spacing, and footer/meta spacing
- **AND** the Summary card remains a compact status surface rather than a KPI metric card
- **AND** the Images card keeps title, body text, and metadata strip behavior

##### Example: Images info card keeps metadata content while aligning to the family

- **GIVEN** the Images page renders an info card with an icon, title, description, and metadata line
- **WHEN** the shared info-card family is applied
- **THEN** the card keeps the same information blocks and FHD placement
- **AND** its icon/header/body/footer spacing aligns with the family contract instead of an isolated page-local layout

### Requirement: Center KPI and stat value rows without changing page geometry

The implementation SHALL center the value row within the card content area for KPI and stat cards that belong to the shared metric-card family, without changing card geometry, card count, or page-level FHD layout.

#### Scenario: Value row is visually centered inside the card body

- **WHEN** a shared metric-card renders a value and unit pair
- **THEN** the value row is horizontally centered within the card body instead of depending on a left-biased offset
- **AND** the value and unit remain baseline-aligned
- **AND** the card does not change its outer FHD geometry to achieve that alignment

##### Example: Overview value row centers without moving the card frame

- **GIVEN** an Overview KPI card that previously relied on a left-padded value row
- **WHEN** the shared metric-card family renders the value and unit
- **THEN** the numeric row is centered within the card content area
- **AND** the card keeps its original `left`, `top`, `width`, and `height`
- **AND** the sparkline footer still fits below the centered numeric row
