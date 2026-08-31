## Purpose

Defines a unified, scope-aware management workspace for data connections, sources, semantic metrics, derived metrics, usage, diagnostics, and external data so operators can manage the full data chain without treating every source as raw MQTT.

## ADDED Requirements

### Requirement: Data Hub separates connection, source, metric, usage, diagnostics, and external-data concerns

The management application SHALL provide a `Data Hub` workspace with distinct navigable areas for at least `Connections`, `Sources`, `Metrics`, `Derived Metrics`, `Usage`, `Diagnostics`, and `External Data`. Each area SHALL preserve existing management authorization boundaries and SHALL avoid presenting unrelated data domains as MQTT configuration.

#### Scenario: Operator opens Data Hub
- **WHEN** an authorized operator opens Data Hub
- **THEN** the workspace exposes the required areas with clear labels
- **AND** broker configuration appears under Connections or MQTT source management rather than wrapping Weather/External Data

### Requirement: Connections presents the central broker as infrastructure

The Connections area SHALL expose the configured central Mosquitto/MQTT connection state and safe editable broker settings already supported by the product. Broker password/credentials MUST remain masked according to existing security behavior. The UI SHALL NOT require one broker connection per CL/KN site when both sites use the same central broker.

#### Scenario: Both sites use one central broker
- **WHEN** CL and KN data are arriving through the configured central Mosquitto connection
- **THEN** Connections shows one broker connection and its health
- **AND** site separation is represented on sources/metrics rather than by duplicating broker connections

### Requirement: Sources distinguishes managed adapters from generic mappings

The Sources area SHALL list managed source adapters such as Solar Collector separately from operator-managed generic MQTT mappings. Each source row/detail SHALL identify source type, effective site/scope, health/activity, and the semantic metrics or resources it owns when available.

#### Scenario: Operator inspects Solar and custom power sources
- **WHEN** the Solar adapter and generic factory power mappings are both configured
- **THEN** Solar is identified as a managed source with discovered factory/zone resources
- **AND** custom power topics remain editable generic mappings
- **AND** the operator does not need to recreate adapter-owned Solar mappings manually

### Requirement: Metrics is the primary semantic data inventory

The Metrics area SHALL list semantic metric identities by scope and expose at least current value, unit, freshness/evaluation state, source classification, and provenance summary. CL, KN, and global readings that share a semantic key SHALL remain independently identifiable.

#### Scenario: Same metric exists at both sites
- **WHEN** `realTimePower` exists for CL and KN
- **THEN** Metrics can show both scoped identities without renaming the semantic key
- **AND** selecting one reveals that scope's current value/freshness/provenance

### Requirement: Derived Metrics links formula definitions to runtime results

The Derived Metrics area SHALL expose the Derived Metric Registry management/diagnostic capability, including managed versus custom definitions, output scope policy, active revision/status, dependencies, formula summary/editor where authorized, and current evaluation states by applicable scope.

#### Scenario: Operator opens a managed canonical definition
- **WHEN** an operator selects a managed/read-only CL+KN canonical generation definition
- **THEN** the workspace shows its formula/dependencies/evaluation provenance
- **AND** controls respect the registry rule that canonical structure is not freely editable

### Requirement: Usage shows where semantic metrics are consumed

The Usage area SHALL let an operator determine which published page instances, widgets/items, story/readiness contracts, or other registered consumers reference a semantic metric. Usage SHALL be based on effective saved contracts/bindings rather than a text search of MQTT topic strings.

#### Scenario: Operator checks impact before editing a custom derived metric
- **WHEN** a custom derived metric is used by two published widgets
- **THEN** Usage identifies both page instances and widget identities
- **AND** the operator can assess display impact without opening every page manually

### Requirement: Diagnostics exposes a bounded provenance chain

Diagnostics SHALL let authorized operators inspect the effective data chain for a selected metric/widget/source, including relevant scope, source/adapter, source topic when applicable, semantic metric, derived dependencies, current freshness/evaluation state, and consumer usage. Diagnostic output MUST mask credentials/secrets and MUST distinguish data provenance from editable binding identity.

#### Scenario: Operator traces a derived Solar card
- **WHEN** a widget uses a derived metric whose dependency comes from the Solar adapter
- **THEN** Diagnostics can show widget → derived metric → scoped source metric → Solar managed source/topic provenance
- **AND** no broker/source credential is exposed

### Requirement: Management scope selection does not change formal playback authority

Data Hub SHALL provide explicit management scope filters/selectors appropriate to each area, including CL, KN, global, and an all-scope view where supported. These selectors SHALL affect only authorized management reads/actions and MUST NOT change a Device Group's Site Scope or make formal playback endpoints trust a management query parameter.

#### Scenario: Operator changes Metrics filter from CL to KN
- **WHEN** a manager switches Data Hub scope from CL to KN
- **THEN** management diagnostics display KN data
- **AND** connected CL playback devices remain resolved from their Device Context/published bindings without any site change

### Requirement: External Data owns non-MQTT upstream configuration

The External Data area SHALL host management for non-MQTT upstream integrations such as CWA Weather while preserving each integration's existing configuration, refresh, preview, cache, and safe diagnostic capabilities.

#### Scenario: Operator manages Weather
- **WHEN** an operator opens External Data → Weather
- **THEN** the existing Weather configuration/preview/manual refresh/diagnostics are available there
- **AND** the operator is not told that CWA Weather is an MQTT topic mapping concern

### Requirement: Legacy management entry points remain navigationally safe

If `/settings/mqtt` or other existing data-source management URLs are retained for compatibility, they SHALL navigate to the corresponding Data Hub area or a clear compatibility entry without losing pending data unexpectedly. New navigation labels SHALL make Data Hub the primary management concept.

#### Scenario: Operator follows an old MQTT Settings bookmark
- **WHEN** an authorized operator opens the legacy MQTT settings route after Data Hub rollout
- **THEN** the application reaches the MQTT/Connections or Sources area of Data Hub
- **AND** the route does not lead to a dead page or silently place Weather back under MQTT semantics

### Requirement: Data Hub does not introduce a speculative Data Profile

The management workflow SHALL continue to use Device Group Site Scope, Playback Profile, and per-widget trusted scope bindings for the current CL/KN requirements. It SHALL NOT require a separate Data Profile assignment merely to deploy the two current site players.

#### Scenario: Operator configures CL and KN players
- **WHEN** each device is assigned to its site Group and playback profile
- **THEN** normal inherited page data resolves without creating a Data Profile
- **AND** intentionally cross-site widgets remain governed by their published widget bindings
