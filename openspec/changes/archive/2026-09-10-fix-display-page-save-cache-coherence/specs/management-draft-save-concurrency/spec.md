## ADDED Requirements

### Requirement: Synchronize successful display-page draft saves with the stage-page cache

The client SHALL commit the DisplayPageConfigEnvelope returned by a successful display-page draft save to the matching stage-page cache before or together with updating the active React draft session. A later remount for the same page and stage MUST initialize from that returned envelope, including its newest version and baseVersion.

#### Scenario: A saved draft envelope survives remount

- **GIVEN** the overview draft session and stage-page cache are at version 4
- **WHEN** a draft save succeeds and the server returns the overview draft envelope at version 5
- **THEN** the active session MUST use the returned version 5 envelope as its lastLoadedEnvelope
- **AND** the matching stage-page cache MUST contain version 5
- **AND** a later remount of overview draft MUST initialize at version 5
- **AND** the next save from that remounted session MUST use baseVersion 5

#### Scenario: A failed save does not publish an unconfirmed cache snapshot

- **GIVEN** a stage-page cache and active session are at version 4
- **WHEN** the draft save fails without a successful server envelope or an authoritative 409 latestEnvelope
- **THEN** the cache MUST remain at version 4
- **AND** the active local draft and its baseline MUST remain available for retry

### Requirement: Invalidate older display-page reads when a newer envelope is committed

The client SHALL maintain read generations independently for each stage-page cache key. Every external cache prime, successful save, or authoritative conflict-envelope commit MUST advance the generation and detach older pending requests before publishing its envelope. A current read publication SHALL retain a valid current token rather than invalidate itself. An older read response or error MUST NOT replace a newer cache envelope or be delivered to a consumer as its current result. Public loader compatibility SHALL be preserved by resolving superseded reads from the newer committed cache or current pending outcome, never from an obsolete payload or error.

Mounted hydration and reload consumers MUST check both module currentness and owner request/page/stage/lifecycle before changing session, baseline, error, message, or loading. A save commit MUST invalidate the owner's earlier load and settle the loading it takes over. Obsolete success, error, or finally handlers MUST NOT downgrade any active session or clear newer loading. Obsolete loading MUST NOT remain stuck; only a current commit or reconciliation SHALL settle it. A pending finalizer MUST delete its entry only when that entry still identifies the same Promise. Other sessions' local drafts MUST NOT be discarded merely because the cache was primed.

#### Scenario: A late pre-save read cannot overwrite a saved envelope

- **GIVEN** a draft read for overview returns version 4 but remains in flight
- **WHEN** a draft save commits version 5 before that read resolves
- **AND** the read later resolves with version 4
- **THEN** the overview draft cache MUST remain at version 5
- **AND** the late version 4 response MUST NOT replace or downgrade the cache
- **AND** an active reload or hydration awaiting that read MUST NOT replace its session or baseline with version 4
- **AND** a public loader caller MUST receive the newer current outcome rather than the obsolete version 4 envelope

#### Scenario: An obsolete rejection and finalizer cannot change a newer operation

- **GIVEN** R1 is in flight when a save commits version 5 and a newer R2 is then started
- **WHEN** R1 rejects or runs its finally handler while R2 is pending
- **THEN** R1 MUST NOT change the version 5 session, baseline, error, or message
- **AND** R1 MUST NOT clear R2 loading or remove R2 from the pending map
- **AND** a consumer allowed to join pending MUST join R2 rather than R1
- **AND** current completion MUST settle loading without waiting for obsolete cleanup

#### Scenario: A normal current read and external prime preserve currentness

- **GIVEN** the newest read completes with version 4 and no intervening commit exists
- **WHEN** its result is published
- **THEN** the read MUST remain a valid current result for its consumer
- **WHEN** an external prime subsequently commits version 5 while an older read is pending
- **THEN** version 5 MUST invalidate that older pending result without invalidating unrelated page-stage keys

#### Scenario: Stage and page cache entries remain isolated

- **GIVEN** the cache contains overview draft version 5, overview live version 2, and solar draft version 3
- **WHEN** overview draft commits version 6
- **THEN** only the overview draft cache entry MUST change to version 6
- **AND** overview live version 2 MUST remain unchanged
- **AND** solar draft version 3 MUST remain unchanged

### Requirement: Preserve conflict drafts while advancing the newest display-page baseVersion

When a display-page draft save returns an optimistic-concurrency conflict, the client SHALL publish latestEnvelope to the matching cache through the same generation barrier, preserve the active local draft, rebase its server baseline to that envelope, and use that latest version as the baseVersion for a subsequent save. The conflict handling MUST NOT silently overwrite the server, report save success, or discard local edits. This authoritative conflict publication SHALL be distinct from ordinary failed saves without an envelope.

#### Scenario: A conflict retains local edits and prepares the newest retry baseline

- **GIVEN** an active overview draft contains a local title edit based on version 4
- **WHEN** the save returns a 409 conflict with latest overview draft version 6
- **THEN** the active session MUST retain the local title edit and remain dirty
- **AND** the session baseline MUST become the latest server envelope at version 6
- **AND** the matching cache MUST become version 6 and older reads MUST be invalidated
- **AND** cache publication MUST NOT replace the active local title edit
- **AND** the next save request MUST use baseVersion 6
- **AND** the client MUST NOT report the stale save as successful
