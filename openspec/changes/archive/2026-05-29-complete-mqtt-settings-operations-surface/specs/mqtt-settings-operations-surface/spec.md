## ADDED Requirements

### Requirement: Present MQTT topic governance with display-impact-aware workspace summaries

The system SHALL present MQTT topic governance with display-impact-aware workspace summaries in `MQTT Settings`.

#### Scenario: Operator reviews mappings for affected display stories

- **WHEN** the operator opens the topic workspace
- **THEN** the page SHALL show which mappings or gaps affect which display stories or metric families
- **AND** the operator SHALL NOT need to infer impact only from a flat list of topic rows

#### Scenario: Topic row remains editable while workspace summary highlights priority

- **WHEN** the operator edits one topic row inside the workspace
- **THEN** the row SHALL remain directly editable
- **AND** the surrounding workspace SHALL still communicate whether the issue is an idle runtime, a mapping gap, or a healthy mapping

### Requirement: Show section-level draft and runtime guidance across broker, topic, and weather areas

The system SHALL show section-level draft and runtime guidance across broker, topic, and weather areas.

#### Scenario: One section has unsaved changes while another section is runtime-healthy

- **WHEN** an operator changes weather or topic settings without saving
- **THEN** the page SHALL identify which section carries the unsaved scope
- **AND** it SHALL keep unrelated runtime-healthy sections readable without implying they are also dirty

#### Scenario: Broker and topic runtime remain explicit during token alignment

- **WHEN** the broker disconnects or a mapped topic becomes idle
- **THEN** the page SHALL preserve explicit broker and runtime feedback hierarchy
- **AND** the aligned surface SHALL NOT collapse those states into ambiguous neutral panels

### Requirement: Treat weather configuration as an effective header contract

The system SHALL treat weather configuration as an effective header contract in `MQTT Settings`.

#### Scenario: Operator changes preset or location inputs

- **WHEN** the operator changes weather preset, county, station, or custom field selection
- **THEN** the page SHALL show the resulting effective header preview and any validation feedback in the same weather workspace

#### Scenario: Invalid or incomplete weather selection is visible before save

- **WHEN** the selected county, station, or preset configuration is invalid or incomplete
- **THEN** the weather workspace SHALL show explicit validation feedback
- **AND** the operator SHALL be able to understand how the current draft differs from a valid effective header outcome
