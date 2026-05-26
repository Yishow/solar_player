## ADDED Requirements

### Requirement: Declare composable effect support per media surface

The system SHALL declare composable media effect support per media surface rather than per page in the abstract.

#### Scenario: A page has two media surfaces with different support

- **WHEN** a page contains two distinct media surfaces
- **THEN** each surface can declare a different composable-effect support matrix
- **AND** editor/runtime consumers follow the surface-level declaration

##### Example: One media surface supports localized zones while another does not

- **GIVEN** a page contains a hero media surface and a secondary decorative media surface
- **WHEN** support is declared
- **THEN** the hero surface can allow localized composable effects
- **AND** the decorative surface can remain unsupported with an explicit explanation

### Requirement: Start rollout from the most visible managed media surfaces

The system SHALL start composable-effect rollout from the most visible managed media surfaces, including Overview hero and Images main stage, before expanding to less critical surfaces.

#### Scenario: Operator edits an Overview hero media source

- **WHEN** the operator edits the Overview hero media source
- **THEN** the composable effect authoring experience is available there
- **AND** the support matrix for that surface includes the enabled effect kinds and zones

##### Example: Images main stage is first-batch enabled

- **GIVEN** the Images main stage media source
- **WHEN** the first-batch rollout is applied
- **THEN** the source exposes composable effect authoring
- **AND** it no longer depends on the legacy half-complete effect surface

### Requirement: Explain unsupported media surfaces explicitly during rollout

The system SHALL explain unsupported media surfaces explicitly during rollout rather than silently omitting controls.

#### Scenario: Operator selects a not-yet-enabled media surface

- **WHEN** the operator selects a media surface outside the rollout matrix
- **THEN** the editor explains that composable effects are not yet enabled for that surface
- **AND** the absence of controls is explicit rather than ambiguous

##### Example: Unsupported surface presents a reason

- **GIVEN** a secondary media surface has not been enabled for composable effects
- **WHEN** the operator inspects it
- **THEN** the editor provides an unsupported explanation
- **AND** the user is not left guessing whether the feature is broken
