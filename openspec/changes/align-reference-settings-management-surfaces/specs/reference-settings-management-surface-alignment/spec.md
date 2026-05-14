## ADDED Requirements

### Requirement: Align only the declared settings and management form surfaces in this change

The implementation SHALL align only `/settings/playback`, `/settings/images`, `/settings/mqtt`, and `/settings/circuits` in this change, and SHALL NOT expand the same migration batch to playback display routes or unrelated monitoring pages.

#### Scenario: The settings surface batch begins

- **WHEN** this change begins
- **THEN** only the four declared settings and management form routes are in scope for visual alignment
- **AND** playback display routes and monitoring routes remain out of scope for this change

##### Example: scope stays on form-heavy routes

- **GIVEN** the audit file also lists `/overview`, `/solar`, `/history`, and `/device-status`
- **WHEN** this change is applied
- **THEN** those routes are not treated as part of the same settings alignment batch
- **AND** the implementation stays focused on the four declared settings routes

### Requirement: Align settings page panels and form hierarchy while preserving the current interaction contracts

Each in-scope settings route SHALL align its panel hierarchy, form grouping, card rhythm, and status feedback presentation to the corresponding reference page while preserving the current interaction contracts for save, test, upload, selection, preview, list management, and validation.

#### Scenario: A settings page is visually migrated

- **WHEN** one of the four in-scope settings routes is visually migrated
- **THEN** it uses shared reference panels, cards, status pills, and form-row primitives instead of generic dashboard cards
- **AND** its current user actions remain operational rather than becoming decorative reference-only controls

##### Example: playback settings and image management remain operational

- **GIVEN** `/settings/playback` controls ordering and save behavior and `/settings/images` controls upload, selection, and preview behavior
- **WHEN** those routes are aligned to their references
- **THEN** the visual hierarchy changes toward the reference layout
- **AND** the underlying actions keep their existing route-level behavior and contracts

### Requirement: Provide explicit display-state mapping for high-risk settings pages

The implementation SHALL provide explicit display-state mapping for `/settings/mqtt` and `/settings/circuits` so that loading, disabled, error, success, broker status, topic preview, circuit status, and validation feedback remain centralized rather than exploding into route JSX branches.

#### Scenario: MQTT settings renders runtime state

- **WHEN** `/settings/mqtt` renders broker status, topic mapping rows, connection tests, and preview cards
- **THEN** the page resolves broker display fields, topic-row display fields, and loading or error states through an explicit display-state mapping layer
- **AND** the migration does not remove load config, save config, test connection, status feedback, or topic mapping behavior

##### Example: MQTT feedback remains explicit

- **GIVEN** the route is loading settings, has a test-connection result, or receives an API error
- **WHEN** the page renders its reference-aligned panels
- **THEN** the correct disabled, loading, success, or error presentation is produced from a centralized display-state mapping
- **AND** the JSX does not have to recompute those branches ad hoc in multiple regions

#### Scenario: Circuit settings renders editable circuit rows

- **WHEN** `/settings/circuits` renders circuit rows, topic mapping, save or update actions, and validation feedback
- **THEN** the page resolves circuit-row display fields and validation or status feedback through an explicit display-state mapping layer
- **AND** the migration does not remove circuit list management, save or update flows, or validation feedback
