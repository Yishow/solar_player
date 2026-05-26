## ADDED Requirements

### Requirement: Live publishing is launch-complete only after refresh witness passes

Display-page draft publishing SHALL NOT be treated as launch-complete unless the launch review confirms that a successful publish is followed by the expected live playback refresh and operator-visible confirmation.

#### Scenario: Publish flow requires a live refresh witness

- **WHEN** an operator publishes a display-page draft
- **THEN** launch review confirms the live playback reflects the published state
- **AND** the operator can distinguish a successful refresh from a save-only success message

##### Example: Shell or page draft publish must refresh the playback witness

- **GIVEN** an operator publishes a display-page or shell-related draft from the management surface
- **WHEN** the publish request succeeds
- **THEN** launch review confirms the playback witness updates to the newly published state
- **AND** a stale playback surface is treated as a failed live refresh witness
