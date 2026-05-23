## MODIFIED Requirements

### Requirement: Refresh management surfaces only for relevant display sync scopes

The system SHALL refresh a management surface only when the incoming `display:sync.scope` is relevant to that surface's data domain, including an explicit weather scope for surfaces that own weather settings.

#### Scenario: Unrelated display sync is ignored

- **WHEN** a management surface receives a `display:sync` event whose scope does not affect that surface's data
- **THEN** the surface SHALL ignore the event
- **AND** it SHALL NOT reload or show a remote-change warning only because another surface changed

##### Example: Brand editing ignores image-only sync

- **GIVEN** the operator is working in `Brand Assets`
- **WHEN** the app receives a `display:sync` event with the `images` scope only
- **THEN** `Brand Assets` does not reload brand data
- **AND** it does not show a pending remote-change banner for brand drafts

#### Scenario: Weather settings page refreshes only for weather-related changes

- **WHEN** `MQTT Settings` owns weather settings and the app receives a `display:sync` event with the `weather` scope
- **THEN** `MQTT Settings` SHALL treat that event as relevant
- **AND** a management surface with no weather dependency SHALL continue ignoring the same event

### Requirement: Defer only relevant remote changes while a management draft is dirty

The system SHALL defer only relevant remote changes when a management surface has an unresolved local draft, including dirty weather-setting drafts.

#### Scenario: Relevant sync arrives during an unresolved draft

- **WHEN** a management surface has unsaved local edits and receives a relevant `display:sync` event
- **THEN** the surface SHALL mark a pending remote change for that draft
- **AND** unrelated scopes SHALL NOT enter the same pending state

#### Scenario: Dirty weather settings defer only weather-scoped remote changes

- **WHEN** `MQTT Settings` has unsaved weather-setting edits and receives a `display:sync` event with the `weather` scope
- **THEN** the page SHALL mark a pending remote change for the weather draft
- **AND** an unrelated `images` or `brand` scope SHALL NOT place that draft into the same pending state
