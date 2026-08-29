## Purpose

Defines a trusted Display Editor data-inspection and preview context so operators can author metric bindings and preview site-dependent values without weakening formal device-scoped playback authorization.

## ADDED Requirements

### Requirement: Display Editor exposes a dedicated Data inspector for metric-backed items

When a selected editor item supports runtime data, `/display-pages/editor` SHALL expose a dedicated Data inspector separate from media/content source controls. The Data inspector SHALL show and edit the binding's semantic metric, scope selector, supported display formatting, and resolved data status.

#### Scenario: Operator selects a bound KPI card
- **WHEN** an operator selects a value-bearing KPI card and opens the Data inspector
- **THEN** the inspector shows the card's stable item id, metric label/key, scope selector, current preview value, unit/freshness state, and source provenance summary
- **AND** the operator does not need to enter a raw MQTT topic to change the card's metric binding

### Requirement: Editor preview context resolves inherit-device without impersonating a playback client

The management editor SHALL provide a trusted Preview Context for resolving `inherit-device` bindings. The operator SHALL be able to preview at least CL, KN, and an authorized Device or Group context when available. Preview resolution MUST use a management-authorized path and MUST NOT make formal playback endpoints trust a query/header-selected site.

#### Scenario: Operator switches preview from CL to KN
- **WHEN** the selected page contains an `inherit-device` `realTimePower` binding and the operator changes Preview Context from CL to KN
- **THEN** the preview resolves the KN `realTimePower` reading
- **AND** the saved page binding remains `inherit-device`
- **AND** no published playback configuration is modified merely by changing Preview Context

#### Scenario: Operator previews a Device context
- **WHEN** an authorized Device is selected as Preview Context
- **THEN** inherited bindings resolve using that Device's trusted Group/Site context
- **AND** disabled or unauthorized devices are rejected according to management access rules

### Requirement: Explicit binding scope is visually distinguishable from preview context

The Editor SHALL distinguish the binding's saved scope from the temporary Preview Context so an operator can tell whether a widget follows the device or is pinned to CL, KN, or global data.

#### Scenario: KN-pinned widget is previewed in CL context
- **WHEN** Preview Context is CL but the selected widget has saved `scope = kn`
- **THEN** the preview continues to resolve the KN metric for that widget
- **AND** the inspector clearly identifies the binding as pinned to KN rather than implying it follows the CL preview context

### Requirement: Data inspector exposes provenance without making topics the authoring identity

For a resolved metric, the Data inspector SHALL provide read-only provenance sufficient to trace effective scope, semantic metric, source classification, and source topic or managed adapter when available. Provenance is diagnostic metadata and SHALL NOT replace the semantic metric binding with a raw topic binding.

#### Scenario: Solar adapter supplies a metric
- **WHEN** the selected binding resolves to a Solar adapter-managed metric
- **THEN** the Data inspector can show its effective site, source class, and `solar/{SITE}/...` provenance
- **AND** editing the widget still selects a semantic metric rather than the topic string

### Requirement: Preview state is isolated by page instance and context

Management preview caching/state SHALL distinguish at least page instance identity and Preview Context. A resolved preview for one site/device context MUST NOT be reused as the resolved data state for another context.

#### Scenario: Same page instance is previewed for both sites
- **WHEN** an operator previews the same published Overview instance first as CL and then as KN
- **THEN** the KN preview recomputes inherited bindings for KN
- **AND** CL values or freshness are not reused as KN preview state
