## ADDED Requirements

### Requirement: Authoritative display save responses preserve confirmed version order

For each display page and stage cache key, the display configuration client SHALL admit save-success and conflict-latest envelopes against the already confirmed server version before publishing cache state or invalidating in-flight reads. A lower version SHALL NOT replace confirmed cache or session baseline state. An equal version SHALL be idempotent and SHALL NOT create a new publication barrier. A higher version SHALL remain eligible for matching-key cache publication after the initiating owner unmounts. Owner lifecycle checks SHALL independently protect drafts, messages, and loading state.

#### Scenario: Older save success arrives after a newer owner saves

- **GIVEN** overview draft version 4 has save R1 pending, the user leaves and returns, and the new owner receives conflict version 5 then saves version 6
- **WHEN** R1 returns version 5 after version 6 is confirmed
- **THEN** the cache and subsequent remount SHALL retain version 6 and its content
- **AND** the next save SHALL use baseVersion 6
- **AND** R1 SHALL NOT alter the new owner's draft, message, or loading state

#### Scenario: Older conflict latest envelope cannot downgrade state

- **GIVEN** the matching cache has confirmed version 6 and a local unsaved draft exists
- **WHEN** an earlier save returns a conflict containing latestEnvelope version 5
- **THEN** the client SHALL preserve version 6 as the confirmed baseline and retain the local draft
- **AND** the rejected envelope SHALL NOT invalidate a newer in-flight read

#### Scenario: Repeated same-version response is idempotent

- **GIVEN** version 6 is already confirmed for a page and stage
- **WHEN** another authoritative response supplies version 6
- **THEN** the client SHALL reuse the confirmed envelope without a new cache publication barrier
- **AND** the response SHALL be able to settle only its still-current owner's operation
- **AND** it SHALL NOT cancel or obsolete a newer read merely by repeating version 6

#### Scenario: Newer response remains usable after unmount

- **GIVEN** overview draft version 4 is confirmed and its owner starts a save then unmounts
- **WHEN** that save returns version 5 before any newer version is confirmed
- **THEN** the matching cache SHALL publish version 5 for a later remount
- **AND** unrelated pages, the live stage, and the next owner's draft state SHALL remain unchanged

#### Scenario: Existing failure and read fences remain intact

- **WHEN** an ordinary save fails or a read begun before an accepted newer publication completes
- **THEN** the save failure SHALL preserve the owner's unsaved draft under the existing error contract
- **AND** the stale read SHALL NOT overwrite the accepted publication
