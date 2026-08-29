# site-scoped-metric-runtime Specification

## Purpose
Defines the authoritative multi-site metric contract so one Solar Player server can ingest, persist, resolve, stream, and diagnose CL, KN, and explicit global data without collisions or cross-site leakage.

## Requirements

### Requirement: Metric identity includes an explicit data scope

The system SHALL identify every runtime metric by the pair `(metricScope, metricKey)`, where `metricScope` is exactly `cl`, `kn`, or `global`. The system MUST NOT use `NULL`, an empty string, a page id, or a site name embedded in `metricKey` as a substitute for metric scope.

#### Scenario: CL and KN publish the same semantic metric
- **WHEN** CL and KN each produce a `realTimePower` reading
- **THEN** the system stores and resolves `cl/realTimePower` and `kn/realTimePower` as distinct metric identities
- **AND** updating one identity SHALL NOT overwrite the other

#### Scenario: A cross-site aggregate is stored
- **WHEN** the system materializes a metric that intentionally represents both factories
- **THEN** the metric SHALL use `metricScope = global`
- **AND** it SHALL NOT masquerade as either `cl` or `kn`

### Requirement: Topic ingestion preserves scope before metric persistence

Each enabled MQTT source mapping or managed source adapter SHALL resolve an explicit metric scope before writing a semantic metric. A mapping for a site-dependent metric MUST NOT be enabled when its scope is ambiguous.

#### Scenario: Two site mappings use the same metric key
- **WHEN** `solar/CL/...` and `solar/KN/...` are both mapped to the semantic metric key `todayGeneration`
- **THEN** the CL mapping writes only `cl/todayGeneration`
- **AND** the KN mapping writes only `kn/todayGeneration`

#### Scenario: A custom mapping has no resolvable site
- **WHEN** an operator enables a site-dependent custom topic mapping without an explicit or managed source scope
- **THEN** the system rejects the mapping with a stable validation error
- **AND** it SHALL NOT infer the site from an unrelated page, device, or previous message

### Requirement: Formal playback resolves metrics from trusted device context

Formal playback metric reads SHALL resolve the device's trusted `SiteScope` to the matching metric scope by default and MAY additionally expose explicitly global metrics. A trusted server-authored published page binding MAY explicitly request a different metric scope for the specific bound metric, but playback clients MUST NOT choose or expand authoritative scope through query parameters, custom headers, local storage, or MQTT subscriptions.

#### Scenario: CL display bootstraps context-scoped live metrics
- **WHEN** a paired device in a `cl` group requests formal playback live metrics and no trusted published binding explicitly requires a KN metric
- **THEN** the response contains CL-scoped metrics required by that playback context plus permitted global metrics
- **AND** it contains no KN-scoped metric values

#### Scenario: Trusted page binding explicitly references KN
- **WHEN** a published server-authored page binding used by a CL device explicitly requires one KN-scoped semantic metric
- **THEN** the server MAY resolve that specific KN metric for the binding
- **AND** the CL client SHALL NOT gain general authority to enumerate or request arbitrary KN metrics

#### Scenario: KN display claims CL in a request
- **WHEN** a paired device in a `kn` group supplies client-controlled input claiming `cl`
- **THEN** the claim is ignored
- **AND** context-inherited playback remains resolved against `kn`

### Requirement: Real-time metric delivery is scope-isolated

The real-time bootstrap and push channels used by playback SHALL deliver the authenticated playback context's inherited-site metrics plus explicitly global data. If a trusted published binding later requires a metric from another site, real-time delivery MUST be narrowed to the specifically authorized binding dependency rather than granting the session the other site's full metric stream. Management diagnostics MAY inspect multiple scopes only through trusted management authorization and an explicit management scope selection.

#### Scenario: CL metric changes while both sites are connected
- **WHEN** `cl/realTimePower` changes while a CL display and a KN display are connected and the KN display has no trusted binding to that CL metric
- **THEN** the CL display receives the corresponding update
- **AND** the KN display SHALL NOT receive the CL-scoped reading

#### Scenario: Trusted cross-site binding requires one CL metric
- **WHEN** a KN playback session has a trusted published binding to `cl/realTimePower`
- **THEN** the session MAY receive updates for that authorized CL metric
- **AND** it SHALL NOT receive unrelated CL metrics solely because one cross-site dependency exists

#### Scenario: Global metric changes
- **WHEN** an explicitly global metric used by both sites changes
- **THEN** both authorized playback contexts MAY receive that global metric update
- **AND** the metric remains identified as `global`

### Requirement: Monitoring history retains metric scope

Site-dependent monitoring snapshots, daily summaries, and cumulative counters SHALL retain their metric scope across writes, range reads, retention, restart restoration, and refresh notifications. Global aggregates SHALL use `global` history records and MUST NOT be mixed into a site's history series.

#### Scenario: Same local day has CL and KN summaries
- **WHEN** CL and KN both accumulate monitoring data for the same local date
- **THEN** the system persists independent CL and KN daily summaries for that date
- **AND** reading the CL history SHALL NOT include the KN summary as a CL row

#### Scenario: Server restarts before a new MQTT message
- **WHEN** persisted CL and KN current-day history exists and the server restarts
- **THEN** each site's playback context restores only the matching site history
- **AND** any persisted global aggregate history remains separately addressable as `global`

### Requirement: Display-only overrides are scope-isolated

A display-only metric override SHALL be identified by its display target and effective metric scope. Applying or clearing an override for one site MUST NOT alter the displayed value for the same page, card, and metric in another site.

#### Scenario: Operator overrides CL Overview power
- **WHEN** an operator applies a display-only override to the CL Overview `realTimePower` target
- **THEN** CL playback uses the override for that target
- **AND** KN playback continues to use its KN source value unless a separate KN override exists

#### Scenario: Global target uses a global override
- **WHEN** a target is bound to an explicitly global metric
- **THEN** any override for that target SHALL be stored and resolved under `global`

### Requirement: Legacy data migration is deterministic and refuses ambiguous site guesses

The migration to scoped metric identities SHALL provide deterministic mappings for repository-known legacy site-encoded metrics. Legacy site-dependent rows that do not contain enough information to determine `cl` or `kn` MUST require an explicit legacy site scope during migration or import; the system MUST NOT silently guess a factory.

#### Scenario: Known Guanyin Factory Circuit metric is migrated
- **WHEN** a legacy row uses a repository-known Guanyin-specific metric key such as `factoryCircuit.guanyin.stampingPower`
- **THEN** migration converts it to the canonical semantic Factory Circuit stamping metric under `metricScope = kn`
- **AND** the migrated identity no longer depends on `guanyin` being encoded in the metric key

#### Scenario: Unscoped legacy metric is ambiguous
- **WHEN** a legacy database contains a site-dependent `realTimePower` row with no site metadata and no explicit legacy migration scope
- **THEN** migration/import SHALL stop with a diagnostic that identifies the ambiguous row or dataset
- **AND** it SHALL NOT assign the row to CL or KN by default
