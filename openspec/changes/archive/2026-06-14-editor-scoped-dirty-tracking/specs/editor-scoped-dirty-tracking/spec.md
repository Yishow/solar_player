## ADDED Requirements

### Requirement: Display editor derives dirty state from scoped operations

The system SHALL derive display editor dirty state from scoped edit operations instead of requiring full-config serialization comparison on each interaction.

#### Scenario: Scoped edit operation marks dirty state correctly

- **WHEN** the operator updates a field, drags a region, or resizes a canvas object
- **THEN** the editor marks dirty state from that scoped operation
- **AND** it does not require a full-config serialization comparison for the interaction

##### Example: field edit records only its dirty path

- **GIVEN** the editor draft matches the latest baseline and the operator edits `heroCopy.titleLines`
- **WHEN** the field update is applied through `applyConfigUpdate` with dirty path `["heroCopy", "titleLines"]`
- **THEN** the draft session is dirty
- **AND** resetting that same path reconciles it against the baseline without comparing the full config

#### Scenario: Baseline-changing operations reconcile dirty state correctly

- **WHEN** the operator undoes, redoes, resets, reloads, or hits a save conflict
- **THEN** the editor reconciles dirty state against the latest baseline
- **AND** the resulting dirty indicator matches the visible draft state

##### Example: save conflict rebases dirty markers

- **GIVEN** the operator has a local dirty draft and the server returns a newer draft baseline during save
- **WHEN** the save conflict handler rebases the session to the latest baseline
- **THEN** the visible local draft remains dirty
- **AND** stale undo/redo dirty snapshots from the old baseline SHALL NOT mark the rebased draft clean
