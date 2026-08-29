## Purpose

Defines how value-bearing display widgets bind to stable semantic metrics and trusted data scopes so page configuration can be reused across sites without exposing MQTT topology or relying on array position.

## ADDED Requirements

### Requirement: Value-bearing widgets use stable binding identity

Every authorable value-bearing widget or card SHALL have a stable item identifier that remains its data-binding identity across reorder, layout movement, style changes, and unrelated item insertion/removal. Runtime data MUST NOT be matched to a widget solely by array index or render position.

#### Scenario: Operator reorders KPI cards
- **WHEN** two configured KPI cards are reordered without changing their stable item ids
- **THEN** each card retains its previous data binding
- **AND** neither card begins displaying the other card's metric because its array index changed

#### Scenario: A new widget is inserted before an existing widget
- **WHEN** an operator inserts a new widget before an existing bound widget
- **THEN** the existing widget keeps its metric binding by stable id
- **AND** no migration based on the new positional index is required

### Requirement: Widget data bindings reference semantic metrics, not MQTT topics

A metric-backed widget data binding SHALL identify a semantic `metricKey` and a scope selector. The page configuration MUST NOT require or persist a raw MQTT topic as the widget's primary data source identity.

#### Scenario: MQTT source topic changes
- **WHEN** the source topic behind a semantic metric changes but its semantic identity remains valid
- **THEN** the widget configuration remains unchanged
- **AND** the widget continues to resolve the metric through the scoped metric runtime

### Requirement: Widget scope selector supports inherited and trusted explicit scopes

A metric-backed widget SHALL support scope selector values `inherit-device`, `cl`, `kn`, and `global`.

- `inherit-device` SHALL resolve to the authenticated Display Client Context Site Scope during formal playback and SHALL be the default for site-dependent playback widgets.
- `cl`, `kn`, and `global` SHALL be trusted server-authored configuration values, not client-selected runtime inputs.
- An explicit `cl` or `kn` binding MAY intentionally display a cross-site metric on a device from the other site, but it MUST authorize only the metrics required by the published bindings.

#### Scenario: Shared Overview page uses inherited power
- **WHEN** the same published Overview page containing `metricKey = realTimePower` and `scope = inherit-device` is rendered by a CL device and a KN device
- **THEN** the CL widget resolves `cl/realTimePower`
- **AND** the KN widget resolves `kn/realTimePower`
- **AND** the page configuration is identical for both devices

#### Scenario: CL page intentionally shows one KN metric
- **WHEN** a trusted published widget binding explicitly sets `scope = kn` on a page rendered by a CL device
- **THEN** that widget resolves the configured KN semantic metric
- **AND** the CL client does not gain authority to request unrelated KN metrics

#### Scenario: Client attempts to change scope locally
- **WHEN** a playback client changes a query parameter, header, local state, or JavaScript value to claim a different scope
- **THEN** the server-authoritative published binding and Display Client Context remain authoritative
- **AND** the client cannot expand the set of scoped metrics delivered to it

### Requirement: Binding resolution includes value, freshness, provenance, and fallback as one result

The runtime result for a widget binding SHALL resolve displayed source value, effective metric scope, freshness, provenance, and fallback state from the same binding context. A widget MUST NOT combine a value resolved from one scope with freshness or provenance from another scope.

#### Scenario: KN power is stale while CL is fresh
- **WHEN** a widget explicitly or implicitly resolves `kn/realTimePower`, KN is stale, and CL is fresh
- **THEN** the widget reports the KN value/fallback and KN freshness
- **AND** CL freshness SHALL NOT make the KN widget appear healthy

### Requirement: Data bindings validate against the metric catalog

A saved binding SHALL reference a metric known to the shared metric catalog/contract for the selected widget family or shall be rejected with a stable validation error. Binding validation SHALL distinguish unknown metric, incompatible scope, unsupported widget value type, and missing required binding data.

#### Scenario: Numeric widget selects an unknown metric
- **WHEN** an operator attempts to save a numeric widget with an unknown `metricKey`
- **THEN** the save is rejected with a stable unknown-metric validation result
- **AND** the existing published binding remains unchanged

### Requirement: Legacy pages receive deterministic default bindings

Existing published Overview, Solar, and supported Factory Circuit configurations that predate explicit data bindings SHALL be migrated or normalized to stable widget ids and bindings derived from the repository-owned playback metric defaults. The migration MUST preserve the existing displayed metric selection and SHALL NOT infer bindings from array position after stable ids have been assigned.

#### Scenario: Existing Overview is opened after migration
- **WHEN** an Overview configuration created before explicit data bindings is loaded
- **THEN** each existing value-bearing widget has a deterministic stable id and equivalent default metric binding
- **AND** the page renders the same metric meanings as before migration

### Requirement: Widget formula text is not part of the binding

A widget data binding SHALL select a semantic metric identity only. It MUST NOT execute or persist an arbitrary per-widget calculation expression as part of this capability.

#### Scenario: Operator wants a calculated ratio
- **WHEN** an operator selects a calculated metric for a widget
- **THEN** the binding references the registered derived metric key
- **AND** the widget does not store or evaluate the derived metric formula itself
