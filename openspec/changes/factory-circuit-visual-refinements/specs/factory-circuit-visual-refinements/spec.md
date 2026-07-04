## ADDED Requirements

### Requirement: Guanyin Site Configuration Seeding
The system database initialization script MUST explicitly seed the display page stage configurations for the page key `factory-circuit-guanyin`.
- The configuration `config_json` SHALL define exactly 8 load rows: `stamping`, `body`, `painting`, `assembly`, `utility`, `office`, `heavy_vehicle`, and `ed_coating`.
- All 8 load rows MUST have their visibility status set to `visible: true` by default.
- The 8 rows SHALL be positioned using the compact layout coordinates (height: 65px, horizontal width: 470px, vertical positions starting from top 146px with a vertical step of 74px: 146, 220, 294, 368, 442, 516, 590, 664).

#### Scenario: Running db seeding for display configs
- **WHEN** the server executes the database seed command
- **THEN** the `display_page_configs` table MUST contain a record for `factory-circuit-guanyin` with the 8-row compact layout JSON
- **AND** the `display_page_stage_configs` table MUST contain both `draft` and `live` records for `factory-circuit-guanyin` with the same configuration JSON

### Requirement: Dynamic SVG Connector Layout Alignment
The vertical bus line of the dynamic SVG routing path in the Factory Circuit page MUST align perfectly with the active branches, preventing empty overhangs.
- The vertical bus line Y-coordinate start point SHALL be exactly `minY + 16`
- The vertical bus line Y-coordinate end point SHALL be exactly `maxY - 16`
- The system MUST NOT draw vertical lines beyond these boundaries.
- To prevent clipping of the bottom rows (e.g. `ed_coating` at Y=546.5), the SVG viewport height MUST be expanded from 526px to 600px (viewBox="0 0 140 600").

#### Scenario: Rendering the vertical bus line
- **WHEN** the browser renders the dynamic SVG power routing paths
- **THEN** the vertical bus line Y-coordinate start point SHALL be exactly `minY + 16`
- **AND** the vertical bus line Y-coordinate end point SHALL be exactly `maxY - 16`

### Requirement: Vector SVG Connector and Flow Animation
All three primary power routing lines on the left side of the Factory Circuit page (Solar-to-Inverter, Inverter-to-Switchboard, Inverter-to-Ground) MUST use responsive inline SVG paths rather than static raster images.
- The lines SHALL feature a glowing, moving dash animation representing power flow.
- The static line width SHALL be 2.5px with color `#527d3b` to maintain consistency.
- The Inverter-to-Ground connection MUST render as a straight vertical downward line extending from the bottom center of the inverter to the top of the KPI cards panel.

#### Scenario: Rendering vector flow lines
- **WHEN** the Factory Circuit page is loaded
- **THEN** the connections SHALL be rendered as vector inline `<svg>` lines
- **AND** the lines SHALL feature a glowing, moving dash animation representing power flow

### Requirement: High-Fidelity Load Row Icons and Copy Typography
The load rows on the Factory Circuit page MUST feature high-fidelity, contextual vector SVG icons for all 8 engineering slots, positioned in line with the labels.
- In the compact layout (card height 65px), the typography and icons MUST scale down to prevent overflowing the card boundaries.
- Chinese labels SHALL use `18px` font size and English subtitles SHALL use `13px` font size.
- The vertical gap between labels MUST be reduced to `2px`.

#### Scenario: Preventing label overflow in compact layout
- **WHEN** rendering the Factory Circuit page under compact mode
- **THEN** the load row Chinese label font size MUST be 18px
- **AND** the English subtitle font size MUST be 13px

### Requirement: Playback Settings Scrollable Containers
The carousel rotation list and page duration lists inside the Playback Settings page MUST prevent container overflow by implementing scrollbar interfaces when items exceed card capacities.
- Both `.ps-card-order` and `.ps-card-duration` card content sections SHALL limit height and enable vertical scrolling (`overflow-y: auto`).
- The containers SHALL display a customized scrollbar matching the green color scheme.

#### Scenario: Setting cards overflow prevention
- **WHEN** the page lists exceed the rotation sequence height
- **THEN** both card content sections SHALL enable vertical scrolling

##### Example: Scrolling settings lists
- **GIVEN** a configuration with 6 active pages
- **WHEN** opening the Playback Settings page
- **THEN** both cards MUST render vertical scrollbars
