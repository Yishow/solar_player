## ADDED Requirements

### Requirement: Runtime source and metric activity is scope-aware in Data Hub

Near-real-time MQTT/source activity shown in Data Hub SHALL preserve the affected metric/source scope. A CL activity update MUST NOT make the corresponding KN row appear newly active merely because the semantic metric key is the same.

#### Scenario: CL mapping receives a new value
- **WHEN** a CL generic MQTT mapping receives a valid message while Data Hub is open
- **THEN** the CL source/metric activity state updates without waiting for a coarse reload
- **AND** the KN row with the same semantic metric key remains unchanged unless it receives its own update

### Requirement: Managed-source activity and generic MQTT activity share diagnostic presentation without sharing ownership

Data Hub SHALL be able to stream/refresh runtime status for both managed sources and generic MQTT mappings while preserving their distinct ownership/editability rules.

#### Scenario: Solar adapter and generic power mapping update concurrently
- **WHEN** the Solar managed source reports new CL data and a generic KN power mapping also receives a value
- **THEN** the workspace can reflect both activity updates
- **AND** Solar adapter-owned fields remain non-editable as generic topic mappings
