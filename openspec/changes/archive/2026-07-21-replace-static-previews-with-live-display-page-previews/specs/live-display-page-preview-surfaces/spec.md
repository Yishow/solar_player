## ADDED Requirements

### Requirement: Render live preview surfaces from published display page config

The system SHALL render management preview surfaces from the current published display page contract instead of static illustration assets.

#### Scenario: Published display page update appears in management preview

- **WHEN** an operator publishes a display page update to `live`
- **THEN** `Playback Settings` and `Slideshow Preview` SHALL render that page from the updated published contract
- **AND** the preview MUST NOT continue showing an older static illustration as its primary source

##### Example: Published hero image changes

- **GIVEN** `Overview` has a published hero media update
- **WHEN** the operator opens `Playback Settings`
- **THEN** the `Overview` preview tile shows the updated hero media
- **AND** the operator does not need to replace a separate preview JPG manually

### Requirement: Surface preview fallback state explicitly

The system SHALL expose preview fallback state explicitly when live preview resolution fails.

#### Scenario: Preview cannot resolve runtime assets

- **WHEN** a management preview surface cannot resolve the live config, required assets, or runtime payload for a display page
- **THEN** the preview SHALL show a visible placeholder or stale-preview state
- **AND** the surface SHALL distinguish preview fallback from normal successful preview rendering

##### Example: Missing image asset shows preview placeholder

- **GIVEN** the published `Images` page references an asset that is no longer available
- **WHEN** `Slideshow Preview` tries to render the `Images` preview tile
- **THEN** the tile shows a preview placeholder or stale-preview state
- **AND** the operator can tell that the preview failed instead of assuming the old artwork is current

### Requirement: Keep live preview surfaces read-only

The system SHALL keep live preview surfaces read-only on management pages.

#### Scenario: Operator inspects preview on Playback Settings

- **WHEN** an operator views a live display page preview on `Playback Settings` or `Slideshow Preview`
- **THEN** the surface SHALL present preview output without editor drag, resize, or field-edit controls
- **AND** any further editing SHALL remain exclusive to `Display Pages Editor`
