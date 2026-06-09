## ADDED Requirements

### Requirement: Author Overview card icon chip style

The system SHALL expose, for each Overview KPI card and each Overview density widget, editable icon chip style configuration covering at least: icon chip background color, icon chip foreground (glyph) color, and icon chip shape (`circle` or `rounded-square`). These fields SHALL be editable in the `/display-pages/editor` Overview inspector, SHALL persist through the existing draft/live mechanism, and SHALL fall back to the seed default when missing or invalid. The icon chip appearance SHALL be driven by runtime CSS variables consumed by Overview-only classes, and SHALL NOT depend on a fixed two-value green/gold accent.

#### Scenario: Inspector exposes icon chip fields

- **WHEN** an operator selects an Overview KPI card or density widget in `/display-pages/editor`
- **THEN** the inspector presents editable fields for icon chip background color, icon chip foreground color, and icon chip shape

#### Scenario: Per-card icon chip color persists to live

- **WHEN** an operator sets a distinct icon chip background color on each of the five Overview KPI cards and saves
- **THEN** the live `/overview` renders each card icon chip with its configured background color

#### Scenario: Rounded-square shape renders

- **WHEN** an operator sets a card icon chip shape to `rounded-square`
- **THEN** that card renders its icon chip as a rounded square rather than a circle

#### Scenario: Invalid icon chip config falls back to seed default

- **WHEN** a card icon chip background or shape value is missing or invalid
- **THEN** the card renders the seed default icon chip (circle with the seed background color) without raising an error

##### Example: Invalid shape falls back to seeded circle chip

- **GIVEN** the `todayGeneration` KPI card omits `iconChipBackground` and stores `iconChipShape: "hexagon"`
- **WHEN** `/overview` resolves the card-style config for playback
- **THEN** the icon chip uses the seeded fallback background and renders as a circle
- **AND** the page continues rendering without an exception
