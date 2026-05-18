## ADDED Requirements

### Requirement: Synchronize display operations state across editor, Playback Settings, and Image Management

The system SHALL synchronize display operations state across `Display Pages Editor`, `Playback Settings`, and `Image Management`.

#### Scenario: Publish state changes after editor action

- **WHEN** an operator publishes or updates display-related state from one management surface
- **THEN** the other affected management surfaces can refresh or receive that state change
- **AND** they do not continue showing stale display operations status indefinitely

##### Example: Playback settings refresh after editor publish

- **GIVEN** the operator publishes a display-page draft from the editor
- **WHEN** `Playback Settings` or `Image Management` next receives the display-ops sync event
- **THEN** those surfaces refresh their publish-related summaries
- **AND** they stop showing the old unpublished state

### Requirement: Surface blockers where operators already work

The system SHALL surface display-operation blockers in the management surface where the relevant operator action is happening.

#### Scenario: Blocker appears in current management page

- **WHEN** a management action depends on unresolved display-operation issues
- **THEN** the current page surfaces that blocker in context
- **AND** the operator is not forced to switch pages just to discover the issue

##### Example: Image deletion warning appears in Image Management itself

- **GIVEN** a selected image is still referenced by a live display page
- **WHEN** the operator attempts to delete that image from `Image Management`
- **THEN** the blocker appears on the current page
- **AND** the operator does not have to open another management route to discover the live reference
