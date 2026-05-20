## ADDED Requirements

### Requirement: Reject stale management draft saves with an explicit optimistic-concurrency conflict
The system SHALL reject stale management draft saves with an explicit optimistic-concurrency conflict instead of silently overwriting newer server state.

#### Scenario: A second session saves an older draft baseline
- **GIVEN** one session has already saved a newer draft version for a management draft resource
- **AND** another session is still editing an older baseline
- **WHEN** the older session tries to save using that stale baseline
- **THEN** the server SHALL return a conflict response
- **AND** it SHALL NOT overwrite the newer draft version on the server

##### Example: Stale display page draft save returns conflict
- **GIVEN** `overview` draft version `5` has already been saved by another operator
- **AND** the current editor is still based on draft version `4`
- **WHEN** the older editor saves its draft changes
- **THEN** the server returns a 409 conflict response
- **AND** the response includes the current server draft baseline for `overview`

### Requirement: Preserve local draft edits when a save conflict occurs
The system SHALL preserve local draft edits when an optimistic-concurrency conflict occurs so the operator can review or reapply them.

#### Scenario: Editor receives a draft-save conflict
- **WHEN** the display page editor receives a conflict from the server
- **THEN** the editor SHALL keep the local unsaved edits available in the client session
- **AND** it SHALL present guidance to reload or reconcile against the newer server draft

##### Example: Conflict does not clear the local session
- **GIVEN** an operator has unsaved layout edits in the editor
- **WHEN** the save request returns a stale-baseline conflict
- **THEN** the editor keeps those local edits in memory
- **AND** the operator can choose to reload the newest server draft before saving again
