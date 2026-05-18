## ADDED Requirements

### Requirement: Provide flow state storytelling for Solar

The system SHALL let the `Solar` display page express operational flow state for its nodes and derived KPI storytelling.

#### Scenario: Solar flow enters a degraded state

- **WHEN** the input metrics indicate low output, reduced efficiency, or other degraded conditions
- **THEN** the `Solar` story model reflects that state for flow nodes or KPI storytelling
- **AND** the display can distinguish degraded operation from normal generation

### Requirement: Support comparison targets in Solar story blocks

The system SHALL let `Solar` compare actual values with configured targets or baselines.

#### Scenario: Solar compares today generation against target

- **WHEN** a configured comparison target exists for a `Solar` KPI or story block
- **THEN** the display route can present actual versus target context
- **AND** missing target data falls back predictably
