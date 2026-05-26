## ADDED Requirements

### Requirement: Display editor exposes a right-side source connection tab

The system SHALL expose a `來源連接` tab in the right-side panel of `/display-pages/editor`. The tab SHALL preserve the current selected editor item and SHALL summarize how that item is connected to its visual or content source.

#### Scenario: Operator selects a hero media region

- **WHEN** the operator selects a hero media region and opens `來源連接`
- **THEN** the panel shows the current source mode
- **AND** the panel identifies whether the region uses seed default, managed asset, direct source, or fallback source
- **AND** switching between `屬性` and `來源連接` does not change the selected region

##### Example: Overview hero uses seed default source

- **GIVEN** the Overview hero media is selected
- **AND** its source mode is `seed-default`
- **WHEN** the operator opens `來源連接`
- **THEN** the panel shows that the current source is the seed/default Overview hero asset
- **AND** it offers replacement actions only when a managed asset replacement path is available

### Requirement: Source connection tab provides replacement and navigation actions

The source connection tab SHALL provide source-oriented actions for eligible selections, including replacing from gallery, opening the integrated asset library workspace, restoring seed/default source, and returning to `屬性` for presentation controls. Actions whose implementation depends on another pending capability SHALL be disabled with an explanation instead of hidden silently.

#### Scenario: Operator opens gallery replacement for a card icon

- **WHEN** a selected card icon supports managed asset replacement
- **THEN** `來源連接` offers a gallery replacement action
- **AND** opening the asset library stays within `/display-pages/editor`
- **AND** returning from the asset library preserves the original editor selection context

##### Example: Unsupported registry icon explains why replacement is unavailable

- **GIVEN** a selected icon still only supports a built-in registry key
- **WHEN** the operator opens `來源連接`
- **THEN** the replacement action is disabled
- **AND** the panel explains that managed visual replacement is not yet available for that source type

### Requirement: Source connection tab keeps presentation controls in Properties

The source connection tab SHALL NOT duplicate image effect, opacity, fade, blur, geometry, layout, or text controls. It SHALL show read-only summaries of active presentation settings when those settings apply to the selected item and SHALL provide a jump back to `屬性` when the operator needs to edit those settings.

#### Scenario: Operator inspects media with edge fade and blur

- **WHEN** the selected media region has edge fade, blur, opacity, or fit mode settings
- **THEN** `來源連接` shows a concise read-only summary of those presentation settings
- **AND** the editable controls remain in `屬性`
- **AND** the panel provides an action to return to `屬性`

##### Example: Blur summary does not create duplicate controls

- **GIVEN** an Images main stage media region has blur enabled
- **WHEN** the operator opens `來源連接`
- **THEN** the panel summarizes the blur state
- **AND** no editable blur amount input is rendered in `來源連接`
