## ADDED Requirements

### Requirement: Persist template-based card rails in display page configuration

The system SHALL persist template-based card rails as part of shared display page configuration so draft, live, preview, and playback flows can all resolve the same rail contract.

#### Scenario: Operator saves a Sustainability card rail draft

- **WHEN** an operator saves a Sustainability draft that includes a card rail container and template-tagged cards
- **THEN** the saved draft includes the rail container geometry and each card's template, visibility, display order, frame, and content source
- **AND** the stored rail data uses the same shared display page configuration channel as the rest of the page

##### Example: Draft stores two cards with independent frames

- **GIVEN** the Sustainability draft contains a rail at `left=68`, `top=578`, `width=470`, `height=108`
- **WHEN** the draft stores cards `summary-1` and `summary-2`
- **THEN** each card keeps its own `frame`, `template`, and `displayOrder`
- **AND** the draft does not collapse them back into a fixed four-item text array

### Requirement: Render card rails through template resolvers

The system SHALL render card rail cards through a template resolver instead of assuming a single fixed summary item shape.

#### Scenario: Runtime resolves cards from template metadata

- **WHEN** a playback or preview route reads a card rail with visible cards
- **THEN** the route chooses the rendering path from each card's template key
- **AND** cards with different templates can coexist inside the same rail without requiring page-local render forks

##### Example: Metric highlight cards render from a template key

- **GIVEN** a card rail contains two cards with the `metric-highlight` template
- **WHEN** the Sustainability page resolves the rail for preview
- **THEN** each card renders from the `metric-highlight` template contract
- **AND** the page does not require a legacy `items[index]` assumption to show the content

### Requirement: Keep metric highlight cards as a first-class compatibility template

The system SHALL treat existing summary highlights as the `metric-highlight` template so prior summary cards remain editable and renderable after the rail schema upgrade.

#### Scenario: Existing highlight seed data is upgraded to metric-highlight cards

- **WHEN** an existing Sustainability seed or saved config is read through the new card rail contract
- **THEN** legacy summary highlights are represented as `metric-highlight` cards with equivalent value, unit, and label content
- **AND** the resulting preview remains visually compatible with the prior summary rail layout

##### Example: Four summary highlights survive the schema migration

- **GIVEN** the prior seed had four highlight summaries for monthly carbon reduction, annual energy saving, green power self-use, and tree equivalence
- **WHEN** the page reads that seed through the card rail contract
- **THEN** the rail exposes four `metric-highlight` cards carrying the same visible content
- **AND** no separate legacy renderer is required
