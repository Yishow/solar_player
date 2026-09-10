## ADDED Requirements

### Requirement: Guard in-flight Weather settings reload responses

The MQTT settings client SHALL guard every asynchronous Weather settings commit, including direct reads and the Weather portion of initial, cached, and non-polling full-model reloads. Each request MUST capture its request generation, mounted lifecycle, synchronous local-mutation generation, and draft/discard intent. A response MUST update weatherSettings and lastSyncedWeatherSettings together only while the request is current, the surface is mounted, no later local mutation occurred, and the request started clean or has explicit discard authorization for that same captured mutation generation. Every local Weather mutator MUST advance the mutation generation synchronously before scheduling its state change, including edits later reverted to the baseline. A failed commit gate MUST preserve both values. Settings persistence owned by Data Hub and Weather diagnostics/preview refresh SHALL remain outside this change.

A current response deferred by local edits SHALL preserve a visible pending remote-change notice even when the values have been reverted and dirty is false. Obsolete success, error, and finally handlers MUST NOT change Weather values, baseline, loading, errors, or pending state. Only the current operation SHALL release its own loading state.

#### Scenario: Deferred response preserves a Weather draft

- **GIVEN** a Weather surface has matching draft and baseline values and starts request R1
- **WHEN** the operator changes updateIntervalMinutes from 30 to 10 before R1 resolves and R1 returns the server value 60
- **THEN** weatherSettings.updateIntervalMinutes MUST remain 10
- **AND** lastSyncedWeatherSettings.updateIntervalMinutes MUST remain 30
- **AND** the surface MUST expose a visible pending remote-change notice
- **AND** the Weather draft MUST remain dirty

#### Scenario: A clean newest response commits the authoritative Weather settings

- **GIVEN** a mounted Weather surface has no Weather edits and request R2 is the newest active request
- **WHEN** R2 resolves with the authoritative Weather settings
- **THEN** the surface MUST set weatherSettings and lastSyncedWeatherSettings to the R2 settings
- **AND** the pending remote-change notice MUST be clear after the successful commit

#### Scenario: The newest Weather request wins

- **GIVEN** request R1 starts for a Weather surface and request R2 starts later for the same surface
- **WHEN** R2 resolves with the newest server settings and R1 resolves afterward with an older snapshot
- **THEN** R2 MUST be the only response allowed to update weatherSettings or lastSyncedWeatherSettings
- **AND** R1 MUST NOT overwrite either state or clear a pending remote-change notice
- **AND** a late R1 rejection or finally handler MUST NOT replace the current error or loading state

#### Scenario: An unmounted Weather surface ignores a late response

- **GIVEN** a Weather surface starts request R1 and unmounts before R1 resolves
- **WHEN** R1 resolves successfully or with an error
- **THEN** R1 success, error, and finally handlers MUST NOT update Weather state, loading, pending remote-change state, or visible error state

#### Scenario: Editing and reverting still defers an in-flight response

- **GIVEN** R1 starts with draft and baseline interval 30
- **WHEN** the operator changes the interval to 10, changes it back to 30, and R1 returns interval 60
- **THEN** draft and baseline MUST remain 30 and the response MUST be deferred
- **AND** pending MUST remain visible even though dirty is false

#### Scenario: A full-model bootstrap cannot bypass the Weather gate

- **GIVEN** an initial or cached full-model reload is in flight
- **WHEN** a local Weather field change or field toggle occurs before the model is applied
- **THEN** applying the model MUST preserve the Weather draft and previous baseline and expose pending
- **AND** broker settings and topic merge behavior MUST retain their existing contracts

### Requirement: Resolve deferred Weather reloads with explicit operator actions

The client SHALL provide explicit resolution for deferred Weather reloads. Keeping the draft SHALL preserve values, baseline, and pending without fetching. Discard SHALL authorize replacement only of the draft present at the click; later local mutations SHALL revoke that replacement permission. Weather reload outcomes and operation currentness SHALL survive void-returning aggregation through a caller-side outcome capture and a Weather-opt-in guard seam. Deferred, obsolete, and failed outcomes SHALL NOT clear pending through generic completion or clean-state effects. Only a still-current, successfully committed reload SHALL clear pending; non-Weather guard consumers SHALL keep their existing behavior.

#### Scenario: Keep editing after a deferred Weather response

- **GIVEN** a Weather surface has a dirty draft and a visible pending remote-change notice
- **WHEN** the operator chooses to keep editing
- **THEN** the local Weather draft MUST remain unchanged
- **AND** the synchronized baseline MUST remain unchanged
- **AND** the pending remote-change notice MUST remain visible
- **AND** no reload request MUST be issued

#### Scenario: Discard and reload replaces the Weather draft

- **GIVEN** a Weather surface has a dirty draft and a pending remote-change notice
- **WHEN** the operator chooses discard/reload, makes no later Weather edit, and the newest reload returns authoritative settings S6
- **THEN** the surface MUST replace weatherSettings and lastSyncedWeatherSettings with S6
- **AND** the pending remote-change notice MUST clear after the successful reload
- **AND** the Weather draft MUST be clean

#### Scenario: Edits after discard are not discarded by the response

- **GIVEN** a dirty Weather draft and pending notice exist when the operator clicks discard/reload
- **WHEN** the operator changes or toggles a Weather field while that request is in flight, including changing it back afterward
- **THEN** the response MUST preserve the post-click draft and original baseline
- **AND** the response MUST be deferred and pending MUST remain visible

#### Scenario: Aggregation and guard effects retain deferred outcomes

- **GIVEN** a polling aggregation receives a deferred Weather outcome while other editable lanes finish
- **WHEN** the aggregate Promise completes and the generic guard evaluates completion and clean-state effects
- **THEN** the Weather outcome MUST still be deferred and pending MUST remain visible
- **AND** a later obsolete completion MUST NOT clear pending established by a newer operation
- **AND** a subsequent still-current safe commit MUST clear pending

#### Scenario: Failed discard and reload preserves the pending draft

- **GIVEN** a Weather surface has a dirty draft and a pending remote-change notice
- **WHEN** the operator chooses discard/reload and the reload fails
- **THEN** the local Weather draft MUST remain available
- **AND** the synchronized baseline MUST remain unchanged
- **AND** the pending remote-change notice MUST remain visible
