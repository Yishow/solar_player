## ADDED Requirements

### Requirement: Provide semantic surface primitives for display operations settings and status pages

The system SHALL provide semantic surface primitives for display-operations settings and status pages so shared management surfaces can reuse one token language for boards, banners, summary strips, table shells, preview surfaces, and dashboard summaries.

#### Scenario: Operations settings page consumes shared surface primitives

- **WHEN** a display-operations settings page renders a title area, action area, summary board, and status feedback surface
- **THEN** those surfaces SHALL consume shared semantic primitives instead of route-local hardcoded appearance rules

#### Scenario: Status dashboard consumes shared token language without collapsing into settings density

- **WHEN** `Device Status` renders dashboard summaries, diagnostics actions, and telemetry panels
- **THEN** it SHALL use the same semantic token language for color, border, shadow, and state tones
- **AND** it SHALL NOT be forced into the same form-density contract as settings pages

### Requirement: Distinguish operations, preview, and status-dashboard surface families

The system SHALL distinguish operations, preview, and status-dashboard surface families so settings workspaces, rotation preview surfaces, and observability dashboards can stay visually related without becoming interchangeable.

#### Scenario: Playback preview surface differs from edit workspace surface

- **WHEN** an operator moves from `Playback Settings` or `Slideshow Preview` to a settings workspace such as `MQTT Settings`
- **THEN** the preview-oriented surfaces SHALL remain identifiable as preview family surfaces
- **AND** the settings workspace SHALL remain identifiable as an operations family surface
- **AND** both SHALL still read as part of one display-operations product language

#### Scenario: Status dashboard remains distinct from settings workspace

- **WHEN** an operator moves from `Circuit Settings` to `Device Status`
- **THEN** the dashboard surface SHALL keep its own summary-first information rhythm
- **AND** it SHALL still reuse the same semantic state tones and shell-compatible surface language

### Requirement: Allow page-local geometry while centralizing appearance semantics

The system SHALL allow page-local geometry and information architecture while centralizing appearance semantics in shared tokens and primitives.

#### Scenario: Page keeps custom layout while adopting shared appearance tokens

- **WHEN** a page retains page-specific layout geometry for its role
- **THEN** its cards, banners, tables, and action surfaces SHALL still derive appearance from shared semantic tokens
- **AND** page-local CSS SHALL only specialize role-specific layout or interaction details

##### Example: playback and device pages keep different geometry

- **GIVEN** `Playback Settings` uses a preview-first composition and `Device Status` uses a dashboard summary composition
- **WHEN** both pages adopt the shared primitive system
- **THEN** the two pages keep different geometry
- **AND** they reuse the same tokenized appearance contract for state tones, borders, shadows, and surface hierarchy
