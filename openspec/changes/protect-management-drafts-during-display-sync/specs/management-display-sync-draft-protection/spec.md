## ADDED Requirements

### Requirement: Preserve dirty management drafts during display sync

The system SHALL preserve unsaved management-surface edits when a `display:sync` event arrives.

#### Scenario: Dirty surface defers background reload

- **WHEN** a management surface has unsaved edits and receives a `display:sync` event
- **THEN** the surface MUST NOT overwrite the local draft with server state
- **AND** the surface SHALL expose a visible remote-change notice with explicit operator actions

##### Example: Playback Settings keeps local ordering edits

- **GIVEN** an operator changed playback page order in `Playback Settings` but did not save
- **WHEN** `display:sync` is emitted because another surface published a display page draft
- **THEN** `Playback Settings` keeps the unsaved local order
- **AND** the page shows that newer remote data is available

### Requirement: Refresh clean management surfaces on display sync

The system SHALL refresh clean management surfaces automatically when a `display:sync` event arrives.

#### Scenario: Clean surface reloads authoritative state

- **WHEN** a management surface has no unsaved edits and receives a `display:sync` event
- **THEN** the surface SHALL reload its authoritative server-backed state
- **AND** publish, readiness, or asset summaries SHALL stop showing stale data

### Requirement: Resolve remote change explicitly

The system SHALL require an explicit operator decision before replacing a dirty management draft with remote state.

#### Scenario: Operator discards dirty draft and reloads

- **WHEN** a dirty management surface shows a remote-change notice and the operator chooses to reload
- **THEN** the surface SHALL replace the local draft with authoritative server state
- **AND** the remote-change notice SHALL clear after a successful reload

##### Example: Circuit Settings discards a local threshold edit

- **GIVEN** `Circuit Settings` has an unsaved threshold change for one circuit
- **WHEN** the operator clicks the remote-change banner action to reload latest data
- **THEN** the unsaved threshold edit is discarded
- **AND** the page shows the newest circuit data from the server

#### Scenario: Operator keeps editing

- **WHEN** a dirty management surface shows a remote-change notice and the operator chooses to keep editing
- **THEN** the local draft SHALL remain unchanged
- **AND** the surface SHALL keep a visible indication that remote data is still pending

##### Example: Image Management keeps playlist edits while remote data is pending

- **GIVEN** `Image Management` has an unsaved playlist duration edit
- **WHEN** the operator chooses to keep editing after a `display:sync` event
- **THEN** the local playlist duration edit remains visible
- **AND** the page continues showing that remote data can be reloaded later
