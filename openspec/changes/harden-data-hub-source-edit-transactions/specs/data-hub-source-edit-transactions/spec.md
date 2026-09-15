## Purpose

Define stable, authorized and version-aware single-source edits for generic Data Hub mappings without bypassing managed ownership or reviewed-source activation contracts.

## ADDED Requirements

### Requirement: Generic source mutations use stable identity and version preconditions
<!-- requirement-id: DHT-R1 -->

The system SHALL expose an authorized stable source reference and configuration revision for generic source editing. A single-source mutation SHALL declare its target, allowlisted patch and expected revision and SHALL modify only that confirmed target. A configuration revision conflict SHALL yield zero configuration writes and preserve the client draft. Database row recreation SHALL not invalidate the public reference.

#### Scenario: Another site changes
<!-- scenario-id: DHT-R1-S01 -->

- **GIVEN** a KN source is being edited while a CL source is changed by someone else
- **WHEN** the KN single-source update is committed
- **THEN** the newer CL settings and unrelated drafts remain unchanged

#### Scenario: Same source changes
<!-- scenario-id: DHT-R1-S02 -->

- **GIVEN** two operators read revision 4 of one source
- **WHEN** one saves revision 5 and the other submits against revision 4
- **THEN** the second receives a conflict with no overwrite

#### Scenario: Stable bookmark after unrelated saves
<!-- scenario-id: DHT-R1-S03 -->

- **GIVEN** a bookmark identifies one generic source
- **WHEN** other source mappings are created or edited
- **THEN** the bookmark still resolves the same source or an explicit not-found result, never a different row

### Requirement: Mutation guards apply atomically and preserve source ownership
<!-- requirement-id: DHT-R2 -->

The server SHALL validate authorization, scope, ownership, supported semantics, references and revision at the mutation commit boundary. Managed and E1-reviewed changes SHALL retain existing guard or reviewed revision workflows. Unknown reference impact SHALL block destructive or identity-changing operations. A frontend site filter SHALL not grant authorization.

#### Scenario: Reference added after preflight
<!-- scenario-id: DHT-R2-S01 -->

- **GIVEN** a delete preflight showed no consumers but another transaction adds one
- **WHEN** delete is submitted
- **THEN** the server refuses the unsafe deletion without removing the source

#### Scenario: Impact service unavailable
<!-- scenario-id: DHT-R2-S02 -->

- **GIVEN** reference impact is unknown
- **WHEN** delete or reidentify is requested
- **THEN** the operation is blocked with a recoverable explanation rather than treated as unreferenced

#### Scenario: Reviewed source semantics change
<!-- scenario-id: DHT-R2-S03 -->

- **GIVEN** a source belongs to E1 reviewed semantics
- **WHEN** the generic edit attempts to change selector or scaling
- **THEN** the existing source-revision guard is enforced and no bypass write occurs

#### Scenario: Authorization revoked
<!-- scenario-id: DHT-R2-S04 -->

- **GIVEN** a user opened an authorized source but lost permission
- **WHEN** the user performs a later read or mutation
- **THEN** access is denied without exposing another site or committing configuration

### Requirement: Mutation outcomes are idempotent and separate runtime reconciliation
<!-- requirement-id: DHT-R3 -->

Mutations SHALL support idempotent recovery for the exact canonical request and report configuration persistence separately from runtime subscription reconciliation. Retrying a committed mutation SHALL not create a second source, reset history or replay captured samples. Reusing an idempotency key for different content SHALL be a conflict. Idempotency result retention SHALL be bounded and explicitly communicated; within the advertised replay window, permission-checked retries SHALL return the committed outcome even after a source was deleted or its revision advanced. An expired replay window SHALL not authorize an automatic new-key retry of an uncertain mutation.

#### Scenario: Committed response lost
<!-- scenario-id: DHT-R3-S01 -->

- **GIVEN** a mutation committed but its HTTP response was lost
- **WHEN** the same canonical request and idempotency key are retried
- **THEN** the original outcome is returned without another domain mutation

#### Scenario: Key reused with changed patch
<!-- scenario-id: DHT-R3-S02 -->

- **GIVEN** an idempotency key already identifies a request
- **WHEN** the key is submitted with different content
- **THEN** the server returns a conflict and does not silently treat it as the original success

#### Scenario: Runtime subscription fails
<!-- scenario-id: DHT-R3-S03 -->

- **GIVEN** configuration is committed and reconciliation fails
- **WHEN** the result renders
- **THEN** the UI shows saved but runtime failed/pending and a safe activation recovery path

#### Scenario: Deleted target retry within replay window
<!-- scenario-id: DHT-R3-S04 -->

- **GIVEN** an authorized delete committed and its result is retained within the advertised replay window
- **WHEN** the same authorized principal retries that exact request
- **THEN** the original deletion outcome is returned without relying on a recreated row or deleting anything else

### Requirement: Legacy writes cannot bypass the new safety guarantee
<!-- requirement-id: DHT-R4 -->

The rollout SHALL preserve existing mapping metadata and public identity and SHALL route legacy replacement writes through the same guarded mutation service with a collection-version precondition, or explicitly reject unversioned legacy writes while the new guarantee is enabled. The UI SHALL feature-detect supported transaction semantics and SHALL not advertise per-source atomicity over an unsafe full-list replace.

#### Scenario: Legacy full list is stale
<!-- scenario-id: DHT-R4-S01 -->

- **GIVEN** an older client submits a stale replacement collection
- **WHEN** versioned editing is enabled
- **THEN** the write conflicts instead of erasing newer source changes

#### Scenario: Migration keeps existing metadata
<!-- scenario-id: DHT-R4-S02 -->

- **GIVEN** legacy rows contain selector, offset, precision and source ownership data
- **WHEN** stable references and revisions are added
- **THEN** existing editable semantics, history, baselines and references remain unchanged

#### Scenario: Server has not upgraded
<!-- scenario-id: DHT-R4-S03 -->

- **GIVEN** the frontend detects only legacy save capability
- **WHEN** the user edits sources
- **THEN** the UI either retains explicit whole-change semantics or disables the new single-source action, never silently emulates it

### Requirement: Draft lifecycle has recoverable close and discard semantics
<!-- requirement-id: DHT-R5 -->

The client SHALL keep independent draft and baseline state per source, preserve drafts on validation/network/conflict failure and use a single navigation guard. Discarding an unsaved local draft SHALL not require a persisted-source impact lookup. Saved-response normalization SHALL establish the new clean baseline. Sensitive form or sample contents SHALL not be persisted in URLs or general browser storage.

#### Scenario: Discard new source
<!-- scenario-id: DHT-R5-S01 -->

- **GIVEN** a new source exists only as a local draft
- **WHEN** the user discards it
- **THEN** it disappears without a server delete or source-impact request

#### Scenario: Save validation fails
<!-- scenario-id: DHT-R5-S02 -->

- **GIVEN** required fields are invalid
- **WHEN** save is attempted
- **THEN** the panel remains open with a focused error summary and all editable values preserved

#### Scenario: Close during uncertain save
<!-- scenario-id: DHT-R5-S03 -->

- **GIVEN** a save may have reached the server but no outcome is known
- **WHEN** the user attempts to leave
- **THEN** the UI explains the uncertain state and does not claim that closing rolled back the server

### Requirement: Receiver mutations preserve subscriber ownership and single physical-channel authority
<!-- requirement-id: DHT-R6 -->

Receiver source edits SHALL reconcile only Player-owned subscriptions while preserving the union with managed Solar filters. They SHALL NOT mutate upstream publisher configuration, issue collector commands or remove another client subscription. Legacy and versioned physical bindings SHALL have at most one accepted canonical writer for the same channel. Engineering bindings SHALL likewise have one authority per site/engineering/purpose/effective period under KNE-R7. Report corrections SHALL use EPR transactions, not this generic configuration PATCH, and SHALL not require or create physical meter identity. Publisher configuration revision, Player configuration revision, E1 source revision, meter epoch, engineering definition and report data revision SHALL remain distinct; normal samples SHALL NOT advance configuration revisions.

#### Scenario: Remove one power mapping
<!-- scenario-id: DHT-R6-S01 -->

- **GIVEN** Player subscribes to managed Solar plus two raw power channels
- **WHEN** one power mapping is disabled
- **THEN** Solar and the other channel remain desired, shared exact-topic consumers are preserved, and no publisher configuration changes

#### Scenario: Reconnect with mixed sources
<!-- scenario-id: DHT-R6-S02 -->

- **GIVEN** Solar and reviewed power sources are configured
- **WHEN** Player reconnects
- **THEN** both managed filters and enabled power topic subscriptions are reconciled for the new generation without replaying capture samples

#### Scenario: Transport migration
<!-- scenario-id: DHT-R6-S03 -->

- **GIVEN** one physical meter moves from legacy opc to a reviewed v1 topic
- **WHEN** the versioned change commits
- **THEN** the old canonical binding is disabled atomically or via a blocked cutover, history continuity is explicitly reviewed, and no subtraction crosses unapproved revisions
