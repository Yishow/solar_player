## ADDED Requirements

### Requirement: Shared display cards SHALL keep a single header visual contract across aligned pages

The implementation SHALL make the shared display card family render one header visual contract across `Solar`, `Overview`, `Sustainability`, and `Images`. The contract SHALL cover header vertical alignment, icon-box placement, title and subtitle rhythm, and footer spacing, while allowing each page to keep its own content slots.

#### Scenario: Monitoring and info cards render through one header contract

- **WHEN** any aligned display page renders a card through the shared display card family
- **THEN** the header uses the same baseline alignment and spacing contract instead of page-local header rhythm overrides
- **AND** page-specific content such as sparkline, growth note, ESG bullets, or metadata strip remains in its own body or footer slot
- **AND** the card keeps its existing FHD geometry and count

##### Example: Overview and Sustainability stop drifting from the Solar header rhythm

- **GIVEN** `Solar` defines the accepted baseline header rhythm for display cards
- **WHEN** `Overview` and `Sustainability` render KPI or stat cards through the shared family
- **THEN** their header alignment, icon-box placement, title/subtitle spacing, and footer rhythm match the same contract
- **AND** their page-specific content still renders in the footer or body slot

### Requirement: Solar SHALL remain the icon-treatment baseline for shared KPI cards

The implementation SHALL preserve `Solar` KPI cards as the icon-treatment baseline when the shared card family is applied. Shared-family refactors MUST NOT replace accepted `Solar` KPI icon assets with a different visual language.

#### Scenario: Solar KPI card keeps its original icon treatment

- **WHEN** `Solar` KPI cards render through the shared card family
- **THEN** each KPI card continues to render its existing asset-backed icon treatment
- **AND** the icon remains positioned inside the shared header icon box contract
- **AND** the shared family does not substitute a generic SVG glyph in place of the accepted `Solar` asset

##### Example: Shared-family cleanup does not swap in a replacement glyph

- **GIVEN** the `Solar` generation KPI previously used its accepted image asset in production
- **WHEN** the shared card family refactors header rendering
- **THEN** the generation KPI still renders that asset-backed icon treatment
- **AND** the visual change is limited to shared placement and rhythm, not icon identity replacement

### Requirement: Shared card typography and value-row alignment SHALL not drift by page

The implementation SHALL keep title, subtitle, unit styling, and value-row alignment consistent across aligned shared cards, unless a difference is explicitly defined as content-slot behavior rather than header or metric rhythm.

#### Scenario: Shared KPI cards keep one typography and alignment language

- **WHEN** `Solar`, `Overview`, or `Sustainability` renders a shared metric card value and unit pair
- **THEN** the value row remains horizontally centered within the card body
- **AND** title, subtitle, and unit styling follow the same shared typography language instead of diverging by page
- **AND** the page does not need to move the outer card geometry to achieve that alignment

##### Example: Overview keeps centered values without retaining a page-local subtitle rhythm

- **GIVEN** an `Overview` KPI card previously used a page-local subtitle margin or unit style
- **WHEN** the shared visual-language contract is applied
- **THEN** the KPI card keeps its centered numeric row
- **AND** its subtitle and unit styling match the same shared language used by other aligned cards
- **AND** the sparkline footer still fits below the numeric row within the same card frame
