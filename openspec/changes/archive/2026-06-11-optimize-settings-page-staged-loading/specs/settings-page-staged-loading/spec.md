## ADDED Requirements

### Requirement: Settings pages render editable state before deferred diagnostics

The system SHALL separate first-screen editable state from deferred diagnostics, previews, polling, and readiness data on Playback Settings, Image Management, MQTT Settings, and Circuit Settings. Each settings page SHALL render its primary editable form or list as soon as the required editable data resolves.

#### Scenario: Playback Settings renders before previews complete

- **WHEN** Playback Settings has loaded playback settings and playback pages but display ops, live preview catalog, rotation diagnostics, or runtime countdown are still loading
- **THEN** the page SHALL render the editable playback settings form and page rows
- **AND** the deferred diagnostics or previews SHALL show their existing loading or degraded states

#### Scenario: Image Management renders before diagnostics complete

- **WHEN** Image Management has loaded image assets and playlist governance data but asset health or selected asset references are still loading
- **THEN** the page SHALL render the image library and playlist controls
- **AND** asset health or selected references SHALL update independently after their requests resolve

#### Scenario: MQTT and Circuit Settings render persisted controls first

- **WHEN** MQTT Settings has loaded persisted broker, topic, and weather settings but weather options, weather preview, readiness, live metrics, or topic polling are still pending
- **THEN** the page SHALL render the persisted controls
- **AND** deferred sections SHALL update independently

### Requirement: Settings page loaders avoid duplicate blocking reads

The system SHALL centralize repeated bootstrap and resync logic for settings pages so the same page does not perform duplicate blocking reads for the same source during route entry.

#### Scenario: Playback Settings does not double-load playback sources

- **WHEN** Playback Settings initializes its editable model and runtime diagnostics
- **THEN** getPlaybackSettings and getDisplayRotationPreview SHALL NOT be required by two independent cold blocking paths before the editable form appears

#### Scenario: Image Management uses one library and playlist model loader

- **WHEN** Image Management bootstraps, saves, or resyncs image library and playlist governance state
- **THEN** the page SHALL use one shared model application path for images, storage usage, playlist entries, resolved playlist entries, shuffle, bulk duration, and selected item state

#### Scenario: Live preview catalog uses one load implementation

- **WHEN** a management page requests live display preview states
- **THEN** bootstrap loading and display sync reload SHALL use the same catalog load implementation
- **AND** the catalog SHALL avoid duplicated registry/config logic inside separate bootstrap and reload branches

### Requirement: Settings optimization preserves functionality and errors

The system SHALL preserve all existing settings behavior while optimizing loading. Saving settings, testing MQTT connection, saving topic mappings, image upload/save/delete/cover operations, playlist governance, circuit add/save/delete, dirty guards, display sync draft protection, access denied states, and MQTT password masking SHALL remain observable.

#### Scenario: Deferred diagnostic failure keeps editable state and surfaces an error

- **WHEN** a deferred display ops, preview, readiness, asset health, asset reference, weather options, or weather preview request fails
- **THEN** the editable page state SHALL remain usable
- **AND** the page SHALL expose the existing error, degraded, or loading feedback for that deferred section
- **AND** the failure SHALL NOT be reported as a successful refresh

#### Scenario: Save, test, and CRUD behavior remains unchanged

- **WHEN** an operator edits and saves playback settings, tests MQTT connection, saves topic mappings, uploads or deletes images, saves playlist governance, adds or deletes circuits, or resolves a display sync draft prompt
- **THEN** the resulting API calls, dirty state transitions, success feedback, and error feedback SHALL match the pre-optimization behavior

#### Scenario: Sensitive and restricted data remains protected

- **WHEN** MQTT settings or management-only diagnostics are loaded after the optimization
- **THEN** MQTT password values returned to the client SHALL remain masked as ****
- **AND** management access denied responses SHALL remain explicit without exposing restricted payloads
