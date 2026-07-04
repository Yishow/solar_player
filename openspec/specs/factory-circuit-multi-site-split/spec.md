# factory-circuit-multi-site-split Specification

## Purpose

TBD - created by archiving change 'factory-circuit-sites-split'. Update Purpose after archive.

## Requirements

### Requirement: Page Registry Multi-site Routing
The system SHALL register two separate playback pages using the `factory-circuit` template in the page registry:
- "factory-circuit" with route "/factory-circuit", display label "中壢廠區用電迴路" in Traditional Chinese.
- "factory-circuit-guanyin" with route "/factory-circuit-guanyin", display label "觀音廠區用電迴路" in Traditional Chinese.

#### Scenario: Navigating to individual site routes
- **WHEN** the browser requests `/factory-circuit`
- **THEN** the system SHALL render the Factory Circuit page representing the Jungli site
- **WHEN** the browser requests `/factory-circuit-guanyin`
- **THEN** the system SHALL render the Factory Circuit page representing the Guanyin site

---
### Requirement: Slot Keys Expansion and Rename
The system MUST support exactly 8 circuit slots representing the actual factory departments:
- `stamping`: Stamping Shop (沖壓工程)
- `body`: Body Shop (車身工程)
- `painting`: Painting Shop (塗裝工程)
- `assembly`: Assembly Shop (裝配工程)
- `utility`: Utility & Powerhouse (原動力)
- `office`: Office & Administration (事務系)
- `heavy_vehicle`: Heavy Vehicle Line (大車工程)
- `ed_coating`: ED Coating Line (ED電著)

#### Scenario: Associating circuits with new slots
- **WHEN** the administrator assigns a circuit to a slot in the circuit settings
- **THEN** the options MUST include `stamping`, `body`, `painting`, `assembly`, `utility`, `office`, `heavy_vehicle`, and `ed_coating`

---
### Requirement: Site-Specific Load Visibility and Geometry Configuration
The system MUST support site-specific configurations for load rows:
- The Jungli site (page key `factory-circuit`) SHALL have `stamping`, `body`, `painting`, `assembly`, `utility`, and `office` slots visible, while `heavy_vehicle` and `ed_coating` are hidden (`visible: false`).
- The Guanyin site (page key `factory-circuit-guanyin`) SHALL have all 8 slots visible.
- The 8-row layout for Guanyin site MUST use a compact arrangement with row height 65px and vertical step 74px to fit inside the FHD canvas without overlapping lower KPI cards.

#### Scenario: Rendering the load panel for Jungli site
- **WHEN** the Jungli site page configuration is resolved
- **THEN** only the 6 standard rows SHALL be displayed on the load panel
- **AND** the vertical spacing SHALL use the standard layout (height: 84px, step: 95px)

#### Scenario: Rendering the load panel for Guanyin site
- **WHEN** the Guanyin site page configuration is resolved
- **THEN** all 8 rows SHALL be displayed on the load panel
- **AND** the vertical spacing SHALL use the compact layout (height: 65px, step: 74px)

---
### Requirement: Dynamic SVG Routing Line Calculation
The SVG power routing path and circles in `/factory-circuit` pages MUST be calculated dynamically based on the vertical position (top) and height of currently visible load rows.

#### Scenario: Auto-generating SVG routing paths
- **WHEN** the page resolves the layout of active load rows
- **THEN** the system SHALL construct the SVG `<path>` and target `<circle>` markers to align perfectly with the left centers of the rendered load rows
- **AND** the system MUST NOT use hardcoded static path coordinates for load row endpoints
