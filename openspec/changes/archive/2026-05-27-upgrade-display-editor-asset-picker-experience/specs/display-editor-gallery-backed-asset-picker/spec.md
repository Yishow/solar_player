## ADDED Requirements

### Requirement: Editor asset pickers provide gallery-backed visual selection

The system SHALL provide gallery-backed asset pickers for Display Pages Editor page objects and Shared Shell Decorations. Asset pickers SHALL show eligible assets with thumbnails, labels, category, usage scope, and selected state instead of relying only on text-only select controls.

#### Scenario: Operator chooses an image asset for a page object

- **WHEN** the operator opens the asset picker for a page freeform image object
- **THEN** the picker shows eligible managed assets as visual cards
- **AND** each card includes a thumbnail and asset metadata
- **AND** choosing a card updates the page object managed asset reference

##### Example: Shell-only asset is hidden from page picker

- **GIVEN** the asset catalog contains one `shell-only` ornament image
- **WHEN** the operator opens a page object asset picker
- **THEN** that shell-only asset is not offered as a selectable page object source

### Requirement: Editor asset pickers preserve editing context when opening the asset workspace

The system SHALL let operators open the integrated asset library workspace from an editor asset picker without losing the original page, shell object, or selected inspector context.

#### Scenario: Operator needs to upload an asset while choosing a shell ornament

- **WHEN** the operator opens the asset workspace from a shell decoration asset picker
- **THEN** the editor navigates within `/display-pages/editor`
- **AND** the original shell decoration selection can be restored when the operator returns
