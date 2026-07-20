## ADDED Requirements

### Requirement: Separate playback shell from management shell

The system SHALL separate playback shell foundations from management shell foundations so fixed FHD display scaling applies only to playback surfaces.

#### Scenario: Management page uses the full viewport

- **WHEN** an operator opens a management route such as the display editor or playback settings
- **THEN** the page renders inside a management shell that can use the full viewport and native scrolling
- **AND** it is not constrained by playback `DisplayCanvas` scaling

##### Example: Display editor is full-size in management mode

- **GIVEN** the display editor route is opened
- **WHEN** the page renders its canvas, sidebars, and inspector
- **THEN** the management shell provides full-page workspace behavior
- **AND** the editor is not clipped or uniformly scaled as though it were a playback slide
