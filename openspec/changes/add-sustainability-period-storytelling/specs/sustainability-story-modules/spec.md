## ADDED Requirements

### Requirement: Compose Sustainability story modules from configurable content blocks

The system SHALL let Sustainability present configurable story modules such as milestones, project outcomes, or ESG summaries.

#### Scenario: Sustainability renders milestone module

- **WHEN** a configured story module is available for Sustainability
- **THEN** the page renders that module in the configured story area
- **AND** unavailable modules can be omitted without breaking the page

##### Example: Milestone module renders below the main statistics

- **GIVEN** Sustainability content includes a milestone module about the latest ESG initiative
- **WHEN** the page resolves story modules for rendering
- **THEN** that milestone module appears in the configured story slot
- **AND** the page remains valid even if another optional module is absent

### Requirement: Keep Sustainability story modules compatible with fallback content

The system SHALL let story modules fall back safely when configured content is missing.

#### Scenario: Story module content is incomplete

- **WHEN** a Sustainability story module lacks some configured content
- **THEN** the page falls back safely for that module
- **AND** the rest of the Sustainability story remains readable

##### Example: ESG summary module is missing one optional bullet

- **GIVEN** an ESG summary module has a title and two bullets but its third optional bullet is missing
- **WHEN** the Sustainability page renders that module
- **THEN** the module falls back safely for the missing content
- **AND** the rest of the story area remains readable
