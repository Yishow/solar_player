## ADDED Requirements

### Requirement: Draft editing requires an authoritative initial baseline

The display-page editor SHALL permit draft mutation only after the active page and stage have an authoritative server envelope and no initial load or confirmed discard reload is pending. The hook mutation entry points and rendered controls SHALL enforce the same readiness state. Live runtime hydration SHALL retain its existing contract.

#### Scenario: Editing is attempted before a cold draft read completes

- **GIVEN** the active draft GET is pending without a server envelope
- **WHEN** a canvas, inspector, reset, undo, redo, or direct draft-update action is attempted
- **THEN** no baseline-free edited session SHALL be created
- **AND** the pending read SHALL remain eligible to hydrate the active owner
- **AND** the editor SHALL expose loading state and disabled editing controls

#### Scenario: Failed initial load can recover

- **WHEN** the initial draft read fails and the operator retries
- **THEN** the editor SHALL expose the failure without claiming the seed is a saved draft
- **AND** editing SHALL become available after the retry supplies a valid envelope
- **AND** a subsequent save SHALL use that envelope as its baseline

#### Scenario: A page switch isolates readiness

- **WHEN** the operator changes the active page or stage during an unresolved initial load
- **THEN** the old response SHALL NOT enable editing or replace the new owner's draft
- **AND** each page and stage SHALL retain the existing cache and version isolation

### Requirement: Discarding a dirty draft requires explicit confirmation

The display-page editor SHALL describe remote reload as discarding local draft changes whenever that is its effect. A dirty draft reload SHALL require an explicit discard choice before replacing local content or history. Cancelling or failing that operation SHALL preserve the local draft. Conflict handling SHALL continue to preserve local edits and advance the authoritative baseline under the existing version contract.

#### Scenario: Conflict reload is cancelled

- **GIVEN** a save conflict preserved a local title edit
- **WHEN** the operator invokes remote reload and cancels the discard confirmation
- **THEN** the title, dirty state, undo history, and active page/stage SHALL remain unchanged
- **AND** no discard read or mutation SHALL start

#### Scenario: Confirmed reload succeeds

- **WHEN** the operator confirms discarding a dirty draft and the remote read succeeds
- **THEN** editing SHALL be locked while replacement is pending
- **AND** only the intended page/stage SHALL adopt the returned current envelope as content and baseline
- **AND** the replaced draft SHALL become clean

#### Scenario: Confirmed reload fails

- **WHEN** a confirmed discard read fails
- **THEN** the local content and history SHALL remain available
- **AND** the editor SHALL display the read failure and allow retry without reporting successful synchronization
