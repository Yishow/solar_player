## ADDED Requirements

### Requirement: Guided destination changes retire only superseded source mappings

For a first guided apply that changes an existing source's destination metric key, the system SHALL resolve the previous destination from persisted source state and SHALL atomically save the new source revision, the reviewed new mapping, and the retirement of the old destination mapping when it is no longer owned by an active source. Retirement SHALL disable the old mapping rather than delete source lineage, measurement history or audit evidence. The system SHALL NOT change another scope's same-named mapping or a mapping currently owned by another active source.

This behavior SHALL retain source-revision rules, current ownership and dependency checks, token and snapshot validation, and idempotency guarantees. A dependency rejection or failure while persisting any part of the rename SHALL leave source definitions, old and new mappings, audit records and apply receipts at their pre-apply state. Replaying an identical committed request SHALL NOT repeat retirement or overwrite a later owner's configuration.

#### Scenario: Enabled source moves to a free destination and different exact topic

- **GIVEN** an enabled reviewed source exclusively owns its old destination and has no unresolved dependencies
- **WHEN** an authorized operator applies a valid higher source revision with a new free destination and a different exact topic
- **THEN** the old source revision and old destination mapping are disabled, the new source and mapping have the reviewed matching enabled state, and the changes commit together
- **AND** no source lineage or accepted measurement history is deleted

#### Scenario: Destination changes while keeping the same exact topic

- **GIVEN** a source is eligible to rename and its new mapping keeps the original exact topic
- **WHEN** the rename commits
- **THEN** only the superseded destination mapping is retired and the topic remains desired for the new destination

#### Scenario: Another scope has the same key

- **GIVEN** CL and KN have separate mappings with the same old metric key
- **WHEN** an eligible KN source is renamed
- **THEN** the KN superseded mapping is retired without changing the CL mapping or source

#### Scenario: A former destination has already been reassigned

- **GIVEN** the source being renamed is inactive and another active source now owns its former scoped destination
- **WHEN** an otherwise valid guided rename is applied to the inactive source
- **THEN** the current owner's source and mapping are preserved, and the historical source's old key is not treated as permission to disable them

#### Scenario: Partial persistence failure rolls back retirement

- **GIVEN** a valid rename would retire an old mapping and save a new mapping
- **WHEN** persistence of the source, either mapping, audit record or receipt fails
- **THEN** none of the rename's state changes become committed and runtime subscription reconciliation is not started

#### Scenario: Identical replay does not re-retire a later owner's mapping

- **GIVEN** a rename already committed and the old destination has subsequently been assigned to another source
- **WHEN** the identical committed request is replayed under the existing replay and ownership rules
- **THEN** its original saved result is returned without another source revision, audit record, receipt or retirement write
- **AND** the later owner's mapping remains unchanged

### Requirement: Post-rename subscriptions converge from current committed ownership

After a guided destination rename commits, subscription reconciliation SHALL derive its desired exact-topic set from current committed enabled mappings and the existing managed owners. A superseded topic with no remaining owner SHALL be removed after successful broker reconciliation. A topic still owned by another mapping or managed source SHALL remain subscribed. A broker reconciliation failure SHALL preserve the committed rename and remain observable and retryable, without reviving the retired mapping or claiming reception from subscription acknowledgement alone.

#### Scenario: Successful reconciliation removes an unowned old topic

- **GIVEN** an active runtime subscribed to an old exact topic and an eligible rename commits a different new topic with no owner remaining on the old topic
- **WHEN** broker reconciliation succeeds
- **THEN** the new topic is active and the old topic is absent from the active subscription set

#### Scenario: Shared topic remains for a different owner

- **GIVEN** another enabled mapping or managed owner still requires the source's old topic
- **WHEN** the source is renamed and subscription reconciliation succeeds
- **THEN** the old topic remains active for its remaining owners while the renamed source's old destination mapping stays disabled

#### Scenario: Broker failure does not undo the saved rename

- **GIVEN** the source and mapping rename is committed
- **WHEN** broker reconciliation fails or the runtime is disconnected
- **THEN** the saved source and mapping states remain committed, activation reports its existing failed or pending retryable state, and a retry uses current committed ownership without duplicate source changes
