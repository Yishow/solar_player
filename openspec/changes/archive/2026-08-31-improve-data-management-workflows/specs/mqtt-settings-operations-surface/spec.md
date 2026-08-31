## ADDED Requirements

### Requirement: MQTT operations are a focused Data Hub source subdomain

The existing MQTT broker/topic management capability SHALL be presented within Data Hub as the infrastructure and generic-MQTT-source portion of the data workflow. It SHALL preserve direct broker and generic topic mapping operations while directing operators to semantic Metrics/Usage/Diagnostics for downstream display impact and to External Data for non-MQTT integrations.

#### Scenario: Operator edits a generic MQTT mapping
- **WHEN** an operator opens the MQTT Sources area from Data Hub
- **THEN** existing editable topic mapping fields and broker-aware health feedback remain available
- **AND** the workspace links the mapping to its semantic metric/scope and downstream usage where known
- **AND** Weather configuration is not embedded as another MQTT mapping section

### Requirement: MQTT mapping rows display explicit metric scope and ownership

Each generic MQTT mapping row/detail SHALL identify its metric scope and whether the target metric identity is operator-managed or reserved by a managed source/derived registry. Attempts to edit a reserved identity SHALL surface the stable ownership conflict rather than allowing a competing writer.

#### Scenario: Operator inspects two same-key mappings
- **WHEN** CL and KN generic mappings both target `factoryCircuit.stampingPower`
- **THEN** the rows remain distinguishable by CL and KN scope
- **AND** each row shows its own topic/activity/provenance state
