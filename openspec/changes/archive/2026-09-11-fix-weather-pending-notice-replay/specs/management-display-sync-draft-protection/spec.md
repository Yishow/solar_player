## ADDED Requirements

### Requirement: Weather reload outcomes cannot be replayed to acknowledge later notices

In the Weather opt-in draft guard, each external reload outcome operationToken SHALL be consumed at most once per guard owner lifecycle. Equal or older tokens SHALL NOT be reprocessed when dirty state changes. Only a new, still-current committed reload outcome SHALL acknowledge the applicable pending remote notice. Local edit, local revert, keep-editing, failed, stale, and deferred outcomes SHALL NOT acknowledge a later notice.

#### Scenario: Reverting a local edit preserves an unread remote notice

- **GIVEN** bootstrap committed token 1 has been consumed, the user edits Weather, and a remote event creates a pending notice while the draft is dirty
- **WHEN** the user reverts local fields to their baseline without a reload
- **THEN** the pending notice SHALL remain visible
- **AND** the reload count after that remote event SHALL remain zero
- **AND** committed token 1 SHALL NOT be replayed because dirty became false

#### Scenario: New committed reload acknowledges pending after explicit discard

- **GIVEN** Weather has a pending remote notice
- **WHEN** the user chooses keep-editing
- **THEN** the guard SHALL preserve pending and SHALL NOT fetch
- **WHEN** the user later explicitly discards and the new reload remains current and commits
- **THEN** that new outcome SHALL clear the applicable pending notice exactly once

#### Scenario: Non-committed or superseded outcomes retain notice

- **WHEN** a new reload produces a failed, stale, or deferred outcome, or an already consumed or older token is delivered again
- **THEN** it SHALL NOT clear a newer pending notice
- **AND** subsequent local dirty transitions SHALL NOT reinterpret that outcome as a committed reload

#### Scenario: First result and owner lifecycle remain correct

- **WHEN** the first current committed reload outcome reaches a mounted Weather guard
- **THEN** it SHALL be processed once
- **AND** effect replay SHALL NOT allow it to acknowledge a subsequently created remote notice
- **WHEN** the owner unmounts or local edits supersede an in-flight discard reload
- **THEN** that reload SHALL retain the existing owner-currentness and local-mutation protections

#### Scenario: Non-Weather consumers retain existing behavior

- **WHEN** a management surface uses the draft guard without the Weather opt-in
- **THEN** its existing clean-state, auto-reload, and pending-notice behavior SHALL remain unchanged
