## ADDED Requirements

### Requirement: Draft source dependencies respect explicit metric scope

A source-impact query SHALL match a draft binding by both metric key and configured scope. A binding explicitly scoped to CL, KN or global SHALL NOT block a different explicit scope merely because its metric key is equal. An all-scope query SHALL retain matching bindings from every scope. An inherited-device binding or a supported legacy binding without an explicit scope SHALL remain a potential dependency for each applicable site; the management query SHALL NOT invent a device context to dismiss it. Registered structural expectations SHALL remain separate from blocking dependencies.

#### Scenario: KN draft does not block CL source
- **GIVEN** a valid draft binds `reviewScopedPower` explicitly to KN and no other resolvable reference uses CL `reviewScopedPower`
- **WHEN** an authorized operator requests the impact of disabling or renaming the CL source
- **THEN** that KN binding is not a blocking consumer, impact is known, and the otherwise valid CL mutation is permitted

#### Scenario: Same-scope dependency still blocks both write paths
- **GIVEN** a valid draft explicitly binds the destination of a KN source to KN
- **WHEN** the operator attempts to disable that source through direct management or guided apply
- **THEN** both requests are rejected with HTTP 409 and `E1_SOURCE_IN_USE`, disclose the relevant draft, and perform no source, mapping, audit, receipt or subscription mutation

#### Scenario: Global and all-scope queries remain distinct
- **WHEN** a valid draft explicitly binds a metric to global and the same key is queried for CL, KN, global and all
- **THEN** the binding is excluded for CL and KN, included for global and all, and the key alone does not establish cross-scope ownership

#### Scenario: Inherited and supported legacy bindings remain conservative
- **WHEN** a matching draft binding inherits its device scope or uses the supported legacy form with omitted scope
- **THEN** the impact read retains it as a potential site dependency instead of assigning an invented effective site or silently ignoring it

### Requirement: Unreadable draft dependency evidence remains unknown

The source-impact read SHALL distinguish a supported, valid draft with no bindings from an unreadable draft dependency surface. Invalid JSON, an invalid present regions or data-bindings container, or a malformed present binding whose destination cannot be established SHALL make the impact unknown, not known-empty. A valid empty regions object or valid empty data-bindings collection SHALL remain known-empty. Supported legacy representations SHALL remain readable. The read SHALL NOT repair, erase or replace persisted draft content.

For a destructive source mutation, unknown draft impact SHALL use the existing HTTP 409 `E1_SOURCE_IMPACT_UNKNOWN` contract in both direct management and guided apply. The unknown response SHALL retain the existing explicit empty consumer and registered-expectation sets. No rejected request SHALL mutate source definitions, topic mappings, audits, receipts, page/profile data, energy history or runtime subscription state.

#### Scenario: Corrupt JSON cannot authorize deletion
- **GIVEN** a persisted draft contains invalid JSON
- **WHEN** an otherwise valid destructive source operation requires the dependency check
- **THEN** impact is unknown, mutation is rejected with `E1_SOURCE_IMPACT_UNKNOWN`, and the corrupt draft and all mutation targets remain unchanged

#### Scenario: Invalid present binding structure is not an empty draft
- **WHEN** the dependency check encounters a present regions, data-bindings or binding value that is not a supported representation and prevents identification of its destination
- **THEN** it reports unknown impact and does not silently discard that value as no dependency

#### Scenario: Valid empty and supported legacy drafts stay usable
- **WHEN** the dependency check reads a supported empty draft or a supported legacy draft
- **THEN** it reports a known result from the actual bindings, allowing an unreferenced source while retaining every applicable legacy reference

#### Scenario: Draft becomes unreadable after preview
- **GIVEN** a guided preview is valid and its source and mapping snapshots remain unchanged
- **WHEN** a draft becomes unreadable before first apply
- **THEN** apply rechecks current dependencies, rejects with `E1_SOURCE_IMPACT_UNKNOWN`, creates no apply receipt or audit, and invokes no subscription reconciliation
