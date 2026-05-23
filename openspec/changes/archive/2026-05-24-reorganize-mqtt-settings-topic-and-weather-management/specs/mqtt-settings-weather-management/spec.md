## ADDED Requirements

### Requirement: Configure weather settings from MQTT Settings

The system SHALL allow operators to configure header weather behavior directly from `MQTT Settings`.

#### Scenario: Operator edits weather behavior in the management page

- **WHEN** an operator opens `MQTT Settings`
- **THEN** the page SHALL provide controls for enabling weather, selecting a location mode, choosing a county or station, selecting a preset, and editing custom field choices
- **AND** the operator SHALL NOT need to navigate to a separate management route to perform those weather-setting tasks

### Requirement: Support presets with a custom-field fallback

The system SHALL support weather field presets and a custom-field mode in `MQTT Settings`.

#### Scenario: Operator selects a preset

- **WHEN** the operator switches to a named preset such as compact, standard, or complete
- **THEN** the page SHALL apply the preset's field list to the weather preview and pending settings
- **AND** it SHALL NOT require the operator to re-check every field manually

#### Scenario: Operator selects custom mode

- **WHEN** the operator switches to custom mode
- **THEN** the page SHALL expose explicit field selection controls
- **AND** the resulting field list SHALL drive the weather preview and saved settings

### Requirement: Preview header weather composition before saving

The system SHALL preview the configured header weather summary inside the weather card before the operator saves the settings.

#### Scenario: Preview reacts to pending field changes

- **WHEN** the operator changes the selected station, preset, or field list in the weather card
- **THEN** the preview SHALL update from the pending form state
- **AND** the operator SHALL be able to inspect the resulting header composition before saving
