## ADDED Requirements

### Requirement: MQTT and Circuit Settings restore persisted controls through reusable editable loaders

The system SHALL restore persisted MQTT and circuit controls through reusable editable loaders for bootstrap, resync, and mutation follow-up paths.

#### Scenario: MQTT Settings restores persisted controls before diagnostics

- **WHEN** MQTT Settings boots or manually resyncs
- **THEN** the page restores persisted broker, topic, and weather controls through the reusable editable loader
- **AND** it keeps weather, readiness, and stream diagnostics in a deferred lane

##### Example: remote sync reload keeps diagnostics deferred

- **GIVEN** MQTT Settings has no local draft edits
- **WHEN** a relevant display sync event asks the page to reload
- **THEN** broker settings, topic mappings, and weather settings reload through the editable loader
- **AND** readiness refresh is scheduled as deferred diagnostics instead of blocking the editable reload

#### Scenario: Circuit Settings restores persisted controls before diagnostics

- **WHEN** Circuit Settings boots or manually resyncs
- **THEN** the page restores the persisted circuit rows through the reusable editable loader
- **AND** it keeps readiness or related diagnostics in a deferred lane

##### Example: circuit resync keeps rows first

- **GIVEN** Circuit Settings has persisted circuit rows
- **WHEN** the operator manually refreshes the circuit table
- **THEN** the circuit rows reload through the editable loader
- **AND** readiness refresh remains outside the persisted-control lane

### Requirement: MQTT and Circuit diagnostics preserve existing safety behavior

The system SHALL preserve dirty guard, masked password, access, and mutation error behavior while deferred diagnostics refresh.

#### Scenario: Diagnostics refresh fails without clearing persisted controls

- **WHEN** MQTT or circuit diagnostics refresh fails after persisted controls are already visible
- **THEN** the page keeps the persisted controls editable
- **AND** it surfaces the existing deferred-lane error semantics without clearing dirty or protected state

##### Example: mutation follow-up does not block controls on diagnostics

- **GIVEN** MQTT Settings saved masked broker settings or Circuit Settings saved row edits
- **WHEN** the follow-up readiness diagnostics refresh fails
- **THEN** the saved controls stay visible and editable
- **AND** dirty guard, masked password, and access-denied behavior remain unchanged
