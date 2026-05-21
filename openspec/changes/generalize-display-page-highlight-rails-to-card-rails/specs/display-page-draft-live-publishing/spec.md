## MODIFIED Requirements

### Requirement: Provide draft and live publishing channels for display page configuration

The system SHALL store display page configuration in separate `draft` and `live` channels so operators can edit pending changes without affecting the production playback routes. Shared display page configuration SHALL include template-based card rails when a page defines rail content.

#### Scenario: Editor saves a draft change

- **GIVEN** an operator is editing `Overview` in the display page editor
- **WHEN** the operator saves the current configuration without publishing it
- **THEN** the configuration is stored in the `draft` channel for that page
- **AND** the production playback route continues using the current `live` configuration

#### Scenario: Draft stores card rail content with the rest of page configuration

- **GIVEN** an operator is editing a page that defines a card rail
- **WHEN** the operator saves a draft containing card rail cards
- **THEN** the `draft` channel stores the rail container and card definitions together with the rest of the page configuration
- **AND** publishing the page promotes that same card rail contract into the `live` channel instead of using a separate rail-only store

##### Example: Sustainability draft stores a template-based rail

- **GIVEN** the Sustainability draft contains a card rail with two visible cards and one hidden card
- **WHEN** the operator saves the draft and later publishes it
- **THEN** the same card rail payload moves from `draft` to `live`
- **AND** preview and playback both resolve the published rail from the shared page configuration envelope
