## ADDED Requirements

### Requirement: Playback metric keys are semantic and site-independent

The shared playback metric contract SHALL describe semantic metric keys independently from factory identity. CL and KN versions of the same measurement SHALL use the same semantic `metricKey` and SHALL be distinguished by resolved metric scope instead of site names embedded in the key.

#### Scenario: Same KPI is rendered at both sites
- **WHEN** Overview at CL and Overview at KN both render real-time power
- **THEN** both page contracts use the semantic metric key `realTimePower`
- **AND** runtime resolution distinguishes the readings by `cl` and `kn` scope

#### Scenario: Factory Circuit slot exists at both sites
- **WHEN** CL and KN both expose a stamping power slot
- **THEN** the shared metric vocabulary uses one stamping semantic metric key for that measurement family
- **AND** the contract SHALL NOT require a `guanyin`, `jungli`, `cl`, or `kn` suffix inside that semantic key to prevent collisions

### Requirement: Runtime subscription contracts carry semantic keys, not raw topics

Runtime subscription key lists SHALL remain lists of semantic metric keys. MQTT topic selection and site routing SHALL occur upstream of the playback contract.

#### Scenario: MQTT topic changes without a page contract change
- **WHEN** the MQTT topic that supplies a semantic metric is changed while the metric identity and meaning remain the same
- **THEN** the playback metric contract remains unchanged
- **AND** playback consumers continue to subscribe by semantic metric key
