## ADDED Requirements

### Requirement: Author internal card style per Overview card and widget

The system SHALL expose, for each Overview KPI card and each Overview density widget, editable internal-style configuration covering at least: icon size, label font size, English subtitle font size, value font size, horizontal padding, vertical padding, trend/sparkline height, and content alignment (start, center, or end). These fields SHALL be editable in the `/display-pages/editor` Overview inspector and SHALL persist through the existing draft/live mechanism.

#### Scenario: Inspector exposes internal-style fields

- **WHEN** an operator selects an Overview KPI card or density widget in `/display-pages/editor`
- **THEN** the inspector presents editable fields for icon size, label font size, subtitle font size, value font size, padding, trend/sparkline height, and content alignment

#### Scenario: Edited internal style persists to draft

- **WHEN** an operator changes an internal-style field and saves the draft
- **THEN** the change is persisted to the draft config and reflected when the Overview draft renders

### Requirement: Render Overview cards from internal-style config without stylesheet hardcoding

The Overview runtime SHALL apply each card's and widget's internal-style configuration via inline style or inline CSS custom properties on the rendered element. The Overview and shared card stylesheets SHALL NOT hardcode pixel values for these authored properties; where a stylesheet references an authored value it SHALL read it from the inline-provided custom property with the current value as fallback.

#### Scenario: Authored value applied to rendered card

- **WHEN** the Overview renders a KPI card whose config sets a value font size
- **THEN** the rendered card's value uses that font size applied via inline style or an inline custom property

#### Scenario: Missing config falls back to seed equivalent

- **WHEN** a card's internal-style config field is absent or invalid
- **THEN** the runtime applies the seed default that equals the pre-change appearance, without throwing or rendering a blank card

### Requirement: Seed internal-style defaults preserve current appearance

The seed defaults for the Overview internal-style fields SHALL equal the current rendered values so that, before any draft edit, the Overview appearance is unchanged by introducing these controls.

#### Scenario: No draft edit leaves appearance unchanged

- **WHEN** the Overview renders with seed defaults and no internal-style draft edits
- **THEN** the cards and widgets render with the same icon size, font sizes, padding, and trend height as before this capability was added
