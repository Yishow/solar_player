## MODIFIED Requirements

### Requirement: Show effective rotation debugging in Slideshow Preview

The system SHALL show effective rotation debugging details in `Slideshow Preview` alongside the visual playback preview.

#### Scenario: Some configured pages are skipped

- **WHEN** the current rotation state skips one or more configured pages
- **THEN** `Slideshow Preview` SHALL show the effective playable sequence and the skipped pages separately
- **AND** it SHALL preserve the machine-readable skip semantics already used by the rotation diagnostics surfaces

#### Scenario: Duplicate template pages keep instance-specific previews

- **WHEN** the effective playable sequence contains two or more page instances that share the same template key
- **THEN** `Slideshow Preview` SHALL render each card with the preview state that matches that page instance
- **AND** it SHALL NOT reuse another instance's ready preview solely because both cards share the same template key

##### Example: Two overview cards stay visually distinct

- **GIVEN** the playable rotation sequence contains `overview` and `overview-2`
- **AND** the two instances have different published live configurations
- **WHEN** `Slideshow Preview` renders the effective sequence
- **THEN** the `overview` card uses the `overview` preview state
- **AND** the `overview-2` card uses the `overview-2` preview state
