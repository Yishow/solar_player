## ADDED Requirements

### Requirement: Separate configured rotation governance from effective rotation diagnostics

The system SHALL separate configured rotation governance from effective rotation diagnostics across `Playback Settings` and `Slideshow Preview` so operators can distinguish what is configured from what will actually play.

#### Scenario: Operator reviews configured pages and effective playable sequence

- **WHEN** an operator opens `Playback Settings`
- **THEN** the page SHALL show the configured rotation controls separately from the effective playable sequence and skip diagnostics

#### Scenario: Effective sequence differs from configured sequence

- **WHEN** one or more configured pages are skipped or blocked by runtime conditions
- **THEN** the rotation surfaces SHALL identify the configured page instance, its skipped state, and the reason it is not in the effective playable sequence

### Requirement: Use one preview status and action language across playback and slideshow surfaces

The system SHALL use one preview status and action language across `Playback Settings` and `Slideshow Preview` while preserving each page's role.

#### Scenario: Operator switches from playback governance to slideshow validation

- **WHEN** the operator moves from `Playback Settings` to `Slideshow Preview`
- **THEN** the preview board, status summaries, and action language SHALL remain visually coherent
- **AND** the page-specific controls SHALL still reflect whether the operator is governing configuration or validating live playback

#### Scenario: Current page and countdown stay readable in both surfaces

- **WHEN** the active page changes or the next-page countdown updates
- **THEN** both playback surfaces SHALL present the active page identity and countdown state using the same semantic status language

### Requirement: Preserve page-instance preview identity across configured and effective boards

The system SHALL preserve page-instance preview identity across configured and effective rotation boards.

#### Scenario: Two configured pages share one template key

- **WHEN** the rotation contains two page instances that share the same template key
- **THEN** each instance SHALL render with its own preview state and label identity
- **AND** the surfaces SHALL NOT reuse another instance's preview state only because the template key matches

##### Example: duplicate overview pages remain distinct

- **GIVEN** the configured rotation contains `overview` and `overview-secondary`
- **WHEN** the operator reviews playback governance or slideshow validation
- **THEN** each instance shows its own preview and instance label
- **AND** skip or active state is attached to the correct page instance
