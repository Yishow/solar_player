## ADDED Requirements

### Requirement: Editor SHALL expose hero chrome typography overrides for all display pages

The system SHALL let the display editor expose hero chrome typography overrides for `Overview`, `Solar`, `FactoryCircuit`, `Images`, and `Sustainability`. These overrides SHALL cover hero title, eyebrow, subtitle, and supported emphasis styling without changing the hero copy content itself.

#### Scenario: Operator edits hero typography on any display page

- **WHEN** the operator selects a page's hero chrome region in the editor
- **THEN** the inspector shows persisted appearance fields for hero typography and emphasis styling
- **AND** changing those fields updates preview and playback without altering the underlying copy strings

##### Example: Images title emphasis changes without rewriting the title text

- **GIVEN** the `Images` page title text remains `綠能現場影像`
- **WHEN** the operator changes only the hero title size, eyebrow spacing, and emphasis weight
- **THEN** the preview updates the hero chrome appearance
- **AND** the stored title text remains `綠能現場影像`

### Requirement: Editor SHALL expose decorative ornament overrides where a page defines ornaments

The system SHALL let the display editor expose decorative ornament overrides for pages that define chrome ornaments such as gold lines, leaf marks, or similar decorative surfaces.

#### Scenario: Overview ornament styling is persisted

- **WHEN** the operator edits a page ornament region such as the `Overview` gold line or leaf mark
- **THEN** the editor persists the ornament appearance fields for that page
- **AND** preview and playback render the same ornament styling

##### Example: Solar gold line thickness and offset update together

- **GIVEN** the `Solar` page defines a gold line ornament
- **WHEN** the operator changes its thickness and vertical offset fields
- **THEN** the saved chrome config preserves those ornament values
- **AND** both preview and playback display the updated gold line styling

### Requirement: Editor SHALL expose page-specific chrome module appearance overrides without changing data sources

The system SHALL let the display editor expose page-specific chrome module appearance overrides for modules such as the `Images` slide counter and arrows, the `Sustainability` period chips and provenance block, and the `FactoryCircuit` status block, while keeping their data sources unchanged.

#### Scenario: Operator changes chrome module appearance only

- **WHEN** the operator edits a page-specific chrome module region
- **THEN** the editor persists appearance-only fields for that module
- **AND** the module continues to read the same runtime or static data source as before

##### Example: Sustainability period chips keep the same period data after appearance edits

- **GIVEN** the `Sustainability` page reads its period options from the same runtime model as before
- **WHEN** the operator changes chip padding, border radius, and gap values
- **THEN** the period chips render the new appearance
- **AND** the available period options and selected period logic remain unchanged
