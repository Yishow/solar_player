## ADDED Requirements

### Requirement: Live metric subscriptions derive from effective widget bindings

Playback live metric subscription requirements SHALL be derived from the page's effective widget binding plan and each selected metric's registered live dependencies. The runtime MUST NOT subscribe to a fixed page-wide metric list that ignores published binding changes.

#### Scenario: Widget binding changes to a different metric
- **WHEN** a published widget changes from metric A to compatible metric B
- **THEN** the next effective subscription plan includes B and B's live dependencies
- **AND** A is no longer retained as a required subscription solely because it was the widget's previous default

### Requirement: Cross-site binding delivery is least-data

When a trusted published binding explicitly selects a metric from a site different from the Device Context Site Scope, the server SHALL deliver only the foreign-scope metric identities required by that session's effective bindings and dependencies. The session MUST NOT receive the foreign site's complete live snapshot or join a broad foreign-site stream solely because one binding crosses scope.

#### Scenario: CL display has one KN widget
- **WHEN** a CL playback session contains one explicit KN `realTimePower` binding and all other bindings inherit CL
- **THEN** the session receives the authorized KN `realTimePower` updates required by that binding
- **AND** unrelated KN circuit, solar-zone, and KPI metrics are not added to the session snapshot or update stream

#### Scenario: Cross-site binding is removed
- **WHEN** the published page no longer contains the KN binding and the playback context refreshes
- **THEN** the session's effective subscription plan drops the KN dependency
- **AND** subsequent KN updates are no longer delivered to that session
