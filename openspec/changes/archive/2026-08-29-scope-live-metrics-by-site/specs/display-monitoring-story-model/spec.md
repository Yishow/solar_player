## ADDED Requirements

### Requirement: Monitoring bindings expose resolved metric scope

Each resolved monitoring metric binding SHALL identify its effective metric scope together with metric key, source class, freshness, fallback state, and provenance. Management diagnostics and playback tooltips SHALL preserve that scope so identical semantic metric keys from CL and KN remain distinguishable.

#### Scenario: Same semantic metric exists at both sites
- **WHEN** management diagnostics include CL and KN readings for `realTimePower`
- **THEN** the CL row identifies `metricScope = cl`
- **AND** the KN row identifies `metricScope = kn`
- **AND** their source topics and freshness are resolved independently

### Requirement: Monitoring display overrides preserve binding scope

Display overrides applied after monitoring source resolution SHALL be matched against the resolved binding scope as well as the display target. An override from another site MUST NOT be considered a matching override.

#### Scenario: CL and KN use the same Overview target id
- **WHEN** a CL override exists for an Overview KPI target and the KN story resolves the same target id and semantic metric key
- **THEN** the KN story ignores the CL override
- **AND** diagnostics MAY show the CL override only when the operator explicitly inspects CL or all scopes
