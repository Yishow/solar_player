## ADDED Requirements

### Requirement: Playback settings prevent draft mutation while saving

PlaybackSettings SHALL lock editable controls, page ordering, resynchronization, and duplicate save submission while its save operation is pending. Previously started long-press and drag interactions SHALL stop producing draft mutations when the lock begins. A failure SHALL preserve the local draft and release the lock only after all submitted save requests have settled, without announcing success.

#### Scenario: Pending save cannot lose newer input

- **GIVEN** an operator submits a playback configuration
- **WHEN** the responses remain pending and the operator attempts to edit duration, transition, enabled state, order, or resynchronize
- **THEN** the attempts SHALL NOT mutate the submitted draft or start competing operations
- **AND** the successful response SHALL become the displayed saved baseline

#### Scenario: A held stepper or drag crosses into pending save

- **WHEN** saving starts during an existing long-press timer or drag interaction
- **THEN** remaining timer callbacks and drag events SHALL NOT change the draft
- **AND** no further repeat timer SHALL remain active for the disabled interaction

#### Scenario: A save fails

- **WHEN** either existing playback save request fails
- **THEN** the UI SHALL retain the local draft, report the failure, and release its save lock
- **AND** it SHALL NOT represent a partial response as complete success or invoke a new rollback API

#### Scenario: One failed request does not unlock another pending write

- **GIVEN** settings request S and pages request P were submitted together
- **WHEN** S rejects while P remains pending
- **THEN** the save lock SHALL remain active and prevent retry, edit, sort, and resynchronization until P settles
- **AND** the final result SHALL preserve the local draft and report failure even if P succeeds

### Requirement: Embedded shell draft indicators share the latest saved content baseline

DisplayPagesEditor and embedded ShellDecorationEditor SHALL derive shell dirty state from the same editable header/footer content and latest successfully loaded or saved baseline. Envelope metadata alone SHALL NOT mark the draft dirty. The page draft SHALL remain independent of the shell draft.

#### Scenario: Shell save clears both indicators

- **GIVEN** shell objects have been edited in the embedded workspace
- **WHEN** shell save succeeds with updated metadata
- **THEN** the parent and embedded editor SHALL both display the shell as saved
- **AND** a dirty page draft SHALL remain dirty

#### Scenario: Metadata updates do not invent edits

- **WHEN** only version, update time, or publication metadata changes while header/footer content remains equivalent
- **THEN** shell dirty state SHALL remain false

#### Scenario: Save failure and asset return preserve the draft

- **WHEN** shell save fails or the operator visits the asset workspace and returns
- **THEN** the current editable objects and their saved baseline SHALL remain available
- **AND** unsaved object changes SHALL remain dirty in both parent and embedded editor
