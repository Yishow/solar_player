## ADDED Requirements

### Requirement: Destructive guided source changes obey current dependency protection

For a first guided apply that disables a currently enabled source or changes an existing source's destination metric key, the server SHALL evaluate the current dependencies of the persisted source's original destination in its concrete site. Guided apply and direct source management SHALL use the same dependency-blocking decision. A client-provided acknowledgement or preview token SHALL NOT substitute for resolving current dependencies.

An unresolved draft, live-page or derived-metric dependency SHALL reject apply with HTTP 409 and `E1_SOURCE_IN_USE`. An unknown impact SHALL reject apply with HTTP 409 and `E1_SOURCE_IMPACT_UNKNOWN`. The caller SHALL be able to inspect the dependencies through the existing source-impact read surface. The rejected apply SHALL leave source definitions, mappings, source audit records, apply receipts, page/profile configuration, energy history and production subscription state unchanged.

The check SHALL use the state at commit time, including dependencies introduced after preview. It SHALL NOT redefine preview status classification: destination ownership conflicts retain their existing 409 behavior and malformed draft previews retain their existing 422 behavior. This dependency requirement applies to first mutations, not to replaying an already committed identical request; existing idempotency and ownership rechecks SHALL remain in force.

#### Scenario: F1 a referenced source cannot be disabled through guided apply

- **GIVEN** an enabled KN source is referenced by an Overview draft and the existing impact read reports that mutation is blocked
- **WHEN** an authorized operator submits a valid new preview token and exact canonical draft that disables that source
- **THEN** apply returns HTTP 409 with `E1_SOURCE_IN_USE`, the source and mapping remain enabled, and no audit, receipt or subscription change is made
- **AND** the existing source-impact read continues to identify the blocking draft

#### Scenario: An in-use source cannot evade the guard by changing its metric key

- **GIVEN** the original destination of an existing source is referenced by a live page or a derived metric
- **WHEN** an otherwise valid guided source revision changes that destination to a currently free metric key
- **THEN** apply evaluates the original destination and rejects with `E1_SOURCE_IN_USE` without creating the replacement mapping or changing the original source

#### Scenario: A dependency introduced after preview still blocks apply

- **GIVEN** a disabling draft was previewed while its source had no consumers
- **WHEN** a dependent draft is saved before the first apply commits
- **THEN** apply rejects with `E1_SOURCE_IN_USE` even though the mapping and source revisions have not changed

#### Scenario: Failed dependency lookup is not an empty dependency set

- **WHEN** current source impact cannot be established during an otherwise valid destructive guided apply
- **THEN** apply returns HTTP 409 with `E1_SOURCE_IMPACT_UNKNOWN` and performs no source, mapping, audit, receipt or runtime mutation

#### Scenario: Non-destructive and unused-source operations remain available

- **WHEN** an authorized request creates a new unowned source, re-enables a source, updates only a display name, or disables an unused source with known empty impact
- **THEN** this dependency guard does not reject the request, and all existing ownership, source revision, token and activation rules still apply

#### Scenario: A rejected apply never reaches runtime activation

- **GIVEN** a valid destructive request targets a source with an unresolved consumer
- **WHEN** the management apply endpoint processes the request
- **THEN** the returned error uses the existing failure envelope and no subscription reconciliation is invoked

#### Scenario: An identical committed request remains a replay rather than a new mutation

- **GIVEN** a request was committed successfully, the same idempotency key and canonical request are submitted again, and current destination ownership still permits the existing replay contract
- **WHEN** the response is replayed after other consumers have been added
- **THEN** the original committed write result is returned without new source, mapping or audit writes, while existing runtime activation and ownership safeguards remain unchanged
