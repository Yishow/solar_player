## ADDED Requirements

### Requirement: Editor SHALL expose persisted card appearance controls for eligible display-card regions

The system SHALL let the display editor expose persisted card appearance controls for eligible display-card regions on `Overview`, `Solar`, `Sustainability`, and `Images`. These controls SHALL cover typography, rhythm, and surface tokens without requiring direct CSS edits.

#### Scenario: Operator edits a Solar KPI card style

- **WHEN** the operator selects a `Solar` KPI region in the display editor
- **THEN** the inspector shows card appearance controls for title, subtitle, value, unit, padding, header spacing, icon box sizing, footer spacing, and value-row alignment
- **AND** changing those controls updates the current draft binding instead of only mutating transient preview state

##### Example: Solar generation card exposes editable typography and rhythm tokens

- **GIVEN** the `generation` KPI card uses the shared display card family
- **WHEN** the operator opens the `generation` region inspector
- **THEN** the editor exposes persisted fields such as `titleFontSize`, `subtitleFontSize`, `valueFontSize`, `unitFontSize`, `headerGap`, `iconBoxSize`, `paddingTop`, and `valueRowAlign`

### Requirement: Card appearance overrides SHALL render through shared display card primitives

The system SHALL resolve persisted card appearance overrides through the shared display card primitives so editor preview, draft playback, and published playback use the same card style contract.

#### Scenario: Overview preview and playback share the same style override

- **WHEN** the operator saves or publishes an `Overview` KPI card appearance override
- **THEN** the preview route and playback route render the same typography, spacing, and surface values for that card
- **AND** the page SHALL NOT require a separate page-local header rhythm override to display the saved appearance

##### Example: Overview total generation card keeps the same title and value sizes after publish

- **GIVEN** the `total` KPI card stores `titleFontSize=22`, `valueFontSize=68`, and `valueRowAlign=center`
- **WHEN** the draft is published and the playback route reloads
- **THEN** the `total` KPI card renders the same title size, value size, and centered value row in both preview and playback

### Requirement: Card appearance overrides SHALL NOT change region geometry or source binding

The system SHALL keep card appearance overrides separate from region geometry and source binding so style-only edits do not rewrite `left`, `top`, `width`, `height`, icon source, or media source fields.

#### Scenario: Style-only edit leaves geometry untouched

- **WHEN** the operator changes only a card appearance field such as `subtitleFontSize` or `cornerRadius`
- **THEN** the saved draft updates only card appearance data
- **AND** the corresponding region geometry and source binding values remain unchanged

##### Example: Sustainability subtitle size change does not move the card

- **GIVEN** the `totalGeneration` KPI card is stored at `left=86`, `top=760`, `width=332`, `height=220`
- **WHEN** the operator changes only `subtitleFontSize` from `14` to `12`
- **THEN** the saved draft keeps `left=86`, `top=760`, `width=332`, and `height=220`
- **AND** the card still uses the same icon and story binding as before
