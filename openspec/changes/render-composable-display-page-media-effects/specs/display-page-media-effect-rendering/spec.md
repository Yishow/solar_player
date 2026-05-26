## ADDED Requirements

### Requirement: Render normalized media effect layers into bounded composable presentation

The system SHALL render normalized media effect layers into bounded media presentation. Localized zone effects and full-frame effects SHALL be able to coexist on the same media source.

#### Scenario: Media source combines full-frame opacity with top-zone mist

- **WHEN** a media source has both a full-frame opacity layer and a top-zone mist layer
- **THEN** the rendered presentation applies both layers
- **AND** the top-zone treatment remains localized to its configured band

##### Example: Whole-image opacity and top-zone mist coexist

- **GIVEN** a supported hero media source
- **WHEN** it has full-frame opacity and top-zone mist
- **THEN** the full frame remains dimmed
- **AND** the top zone receives its additional localized mist treatment

### Requirement: Preserve same-zone stacking order for composable effects

The system SHALL preserve same-zone stacking order when multiple effect layers target the same zone.

#### Scenario: Two layers target the left zone

- **WHEN** two enabled effect layers target the left zone
- **THEN** both layers are rendered in order
- **AND** neither layer is silently dropped merely because they share the same zone

##### Example: Left-zone fade and blur stay stacked

- **GIVEN** a media source has left-zone fade and left-zone blur
- **WHEN** the media presentation is built
- **THEN** the left zone renders both effects
- **AND** the resulting presentation reflects their configured order

### Requirement: Keep composable effect overlays bounded to the owning media layer

The system SHALL keep composable effect overlays bounded to the owning media layer. Media effect overlays SHALL NOT extend above shell chrome or unrelated page content.

#### Scenario: Page uses bottom-edge effects near footer chrome

- **WHEN** a page media source uses bottom-edge effects near footer chrome
- **THEN** the effect remains clipped to the media stage
- **AND** the footer chrome remains readable and unaffected by overlay spillover

##### Example: Footer stays outside the media effect stack

- **GIVEN** a playback page renders a bottom-edge effect
- **WHEN** the page is displayed with shell footer chrome
- **THEN** the footer remains outside the effect overlay
- **AND** the media layer owns the entire effect stack
