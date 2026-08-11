## Purpose

建立管理設定的可稽核變更歷史，忠實記錄系統實際可識別的管理 session/token actor、時間、domain 與 redacted before/after 差異，並提供保留 secrets 與 concurrency precondition 的安全 rollback 流程。

## ADDED Requirements

### Requirement: In-scope management setting mutations create redacted audit events

Successful mutations for MQTT broker/topics, weather, playback settings/pages, circuits, and image playlist/settings SHALL create an audit event containing time, domain, operation, actor provenance available to the system, and a redacted before/after difference.

#### Scenario: Management session changes MQTT host

- **WHEN** an authenticated management session successfully changes a non-secret MQTT broker field
- **THEN** the system SHALL record an audit event identifying the actor as a management session and showing the changed non-secret field
- **AND** it SHALL NOT invent a human username that the authentication system does not know

#### Scenario: Secret value is changed

- **WHEN** an operator changes an MQTT password, access token, CWA authorization, or another configured secret
- **THEN** audit persistence and API responses SHALL record only that the secret changed or was preserved
- **AND** the previous or new secret value SHALL NOT appear in the audit diff, rollback state, or event details

### Requirement: Operators can inspect and filter settings history

The management surface SHALL allow trusted operators to review audit events by time and domain and inspect a bounded redacted change detail.

#### Scenario: Operator investigates a recent display change

- **WHEN** the operator filters settings history to playback and images for a time range
- **THEN** the page SHALL show matching events in chronological context with their operation and actor class

### Requirement: Rollback is previewed and protected by the current revision

Rollback SHALL be implemented as a new validated management mutation linked to the selected historical event. It SHALL preserve current secrets and require a precondition proving the current domain state has not changed since preview.

#### Scenario: Operator previews rollback

- **WHEN** an operator selects a rollback-capable audit event
- **THEN** the system SHALL show which non-secret fields would change, which secret fields will be preserved, and whether the target state passes current validation

#### Scenario: State changes after rollback preview

- **WHEN** another mutation changes the same domain after a rollback preview was generated
- **THEN** applying the stale rollback preview SHALL fail with a conflict
- **AND** the operator SHALL be required to refresh the preview before retrying

#### Scenario: Rollback succeeds

- **WHEN** a valid rollback is applied against the expected current revision
- **THEN** the target domain SHALL be updated through its normal validation/sync path
- **AND** a new audit event with action `rollback` SHALL link to the source historical event
