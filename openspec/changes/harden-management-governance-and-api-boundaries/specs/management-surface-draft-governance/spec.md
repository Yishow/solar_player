## ADDED Requirements

### Requirement: Apply shared draft governance across mutable management surfaces

The system SHALL apply a shared dirty-state and remote-sync governance pattern across mutable management surfaces so one page does not silently behave differently from the others.

#### Scenario: Mutable management page receives a remote sync while dirty

- **WHEN** a mutable management page has unsaved edits and a remote sync event arrives
- **THEN** the page defers reload and exposes the same pending-remote-change behavior used by other governed management surfaces
- **AND** it does not silently discard local edits

##### Example: Brand Assets follows the shared draft guard

- **GIVEN** the `Brand Assets` page contains unsaved edits
- **WHEN** a remote change affecting that management domain arrives
- **THEN** the page keeps the local draft until the operator explicitly reloads or discards it
- **AND** its behavior matches the shared management governance model
