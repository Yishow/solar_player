## ADDED Requirements

### Requirement: Drag feedback reuses stable overlay preparation within a session

The editor SHALL prepare unchanged region frames and page guides once for a stable drag session and compose active-object feedback separately. Frame lookup SHALL use a session index instead of a per-region linear scan. Preparation SHALL be invalidated when its region/config, selection/lock, overlay preset, or viewport inputs change.

#### Scenario: Stable fixture avoids repeated static preparation

- **WHEN** a fixture with 100 unchanged regions receives 100 pointermove events in one drag session without invalidating inputs
- **THEN** static frame and page-guide preparation SHALL run once for that session
- **AND** active feedback guides, measurements, and constraints SHALL match the existing geometry rules for each processed pointer position

#### Scenario: Changed inputs do not reuse obsolete geometry

- **WHEN** an input used by the overlay preparation changes during an active session
- **THEN** the editor SHALL recompute the affected preparation or end the session according to existing interaction rules
- **AND** it SHALL NOT publish geometry or feedback from an invalidated generation

### Requirement: Animation-frame feedback preserves the latest drag commit

The editor SHALL publish at most one React drag feedback update per scheduled animation callback while retaining the latest valid pointer result independently. Pointer release SHALL commit that latest result exactly once with the existing history base, including when the callback has not yet run. Session teardown SHALL cancel pending callbacks and prevent late feedback.

#### Scenario: Multiple moves are coalesced before release

- **WHEN** 100 pointermove events are distributed over 10 controlled animation callbacks and followed by pointerup
- **THEN** the editor SHALL publish at most 10 feedback updates, excluding terminal feedback clearing
- **AND** it SHALL perform one main-config commit and one undo entry with the last valid pointermove result

#### Scenario: Release precedes the scheduled callback

- **WHEN** the last pointermove computes rectangle R and pointerup occurs before its scheduled animation callback
- **THEN** the saved geometry SHALL equal R under the existing snapping and constraint rules
- **AND** no delayed callback SHALL restore feedback after release

#### Scenario: Release coordinates differ from the last move

- **GIVEN** the same drag start and pointer event sequence are supplied to the baseline and candidate
- **WHEN** the last pointermove is at clientX 100 and pointerup is at clientX 120 before the queued callback runs
- **THEN** candidate committed geometry SHALL equal the baseline result for that complete sequence
- **AND** frame coalescing SHALL NOT introduce a new pointerup coordinate-sampling policy

#### Scenario: Session teardown suppresses queued updates

- **WHEN** locking, page/workspace switching, or unmounting terminates the active interaction before a queued callback executes
- **THEN** the callback SHALL be canceled or rejected by the session generation
- **AND** it SHALL NOT mutate the ended session or the newly active page
