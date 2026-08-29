## ADDED Requirements

### Requirement: Source Connection remains a visual/content source surface

The existing `來源連接` / Source Connection panel SHALL continue to describe media, icon, asset, direct-source, seed/default, and fallback content connections. Runtime metric selection SHALL be authored in the dedicated Data inspector instead of overloading Source Connection with MQTT or semantic metric controls.

#### Scenario: Operator selects a hero media region
- **WHEN** the operator opens Source Connection for a hero media region
- **THEN** the panel continues to show the media/content source relationship
- **AND** it does not present a metric picker for that visual source

#### Scenario: Operator selects a metric-backed KPI
- **WHEN** a selected KPI supports both visual/content properties and a runtime metric binding
- **THEN** metric selection is available from the Data inspector
- **AND** any Source Connection content remains limited to the KPI's visual/content source concerns
