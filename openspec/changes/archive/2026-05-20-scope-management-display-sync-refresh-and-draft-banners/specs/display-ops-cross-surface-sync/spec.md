## MODIFIED Requirements

### Requirement: Synchronize display operations state across editor, Playback Settings, and Image Management

The system SHALL synchronize display operations state across affected management surfaces, and each surface SHALL refresh only when the incoming display-ops sync is relevant to the state it owns.

#### Scenario: Publish state changes after editor action

- **WHEN** an operator publishes or updates display-related state from one management surface
- **THEN** the other affected management surfaces can refresh or receive that state change
- **AND** they do not continue showing stale display operations status indefinitely
- **AND** unrelated management surfaces do not reload only because they share the same global socket bus

##### Example: Playback settings refresh after editor publish

- **GIVEN** the operator publishes a display-page draft from the editor
- **WHEN** `Playback Settings` or `Image Management` next receives the display-ops sync event
- **THEN** those surfaces refresh their publish-related summaries
- **AND** they stop showing the old unpublished state
- **AND** a management surface with no relevant display-ops dependency stays unchanged
