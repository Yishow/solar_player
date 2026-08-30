## ADDED Requirements

### Requirement: Card data diagnostics expose registry-backed derived definitions

For a card bound to a registered derived metric, card-centric diagnostics SHALL expose the derived metric key, active definition revision, output scope, formula summary, direct dependencies, effective dependency scopes, current evaluation value/state, freshness, and transitive provenance. Formula text shown in diagnostics SHALL come from the registry definition rather than a separate hardcoded diagnostic string.

#### Scenario: Operator inspects self-consumption ratio
- **WHEN** a card uses the registered `selfConsumptionRatio` metric
- **THEN** diagnostics show the active registry formula/dependencies for the effective site
- **AND** the displayed/current value references the same evaluation result used by playback

### Requirement: Derived metric management actions operate on reusable definitions

When card-data management offers a formula edit or creation action, that action SHALL open or invoke the reusable Derived Metric Registry authoring workflow. It MUST NOT create a private formula attached only to the selected card.

#### Scenario: Operator edits a formula from a card diagnostic
- **WHEN** an operator follows the formula management action from a derived card row
- **THEN** the action targets the registered derived metric definition
- **AND** all widgets bound to that metric will use the newly activated definition after successful validation
- **AND** the card config itself still stores only its metric binding

### Requirement: Derived dependency diagnostics distinguish unmapped inputs from unavailable inputs

Derived dependency diagnostics SHALL determine each dependency's status from whether that dependency currently resolves to a usable reading, not solely from whether a raw topic mapping exists for it. A dependency supplied by a managed adapter or by another derived metric, and currently producing values, SHALL NOT be reported as missing a topic.

#### Scenario: Dependency is supplied without a topic mapping
- **WHEN** a CO2 card depends on a generation metric that has no topic mapping but is currently receiving values
- **THEN** the dependency is reported with its actual resolved state and freshness
- **AND** it is not permanently labelled as a missing topic

### Requirement: Sustainability Card Data uses the global registry identities

Sustainability numeric Card Data rows SHALL consume the `sustainability.global.*` registry evaluations under the existing `global` row scope. Diagnostics SHALL expose the active scope-qualified definition key, revision, expression, direct dependencies, effective scope, evaluation state, freshness, and transitive provenance while preserving the existing row `cardId`, public `metricKey`/big-number field names, displayed units, formatting, and widget bindings.

#### Scenario: Management Card Data inspects a global Sustainability metric
- **WHEN** Card Data reads `sustainability.big-number.accumulatedCarbonReductionTons`, `sustainability.big-number.annualEnergySavingPercent`, or `sustainability.big-number.plantedTreeEquivalent`
- **THEN** the row value comes from the corresponding `sustainability.global.*` evaluation under `global`
- **AND** the row's existing card identity and display contract remain unchanged
- **AND** diagnostics do not report a page-local formula or a site value

#### Scenario: Card Data reports an unavailable global dependency
- **WHEN** a required global counter or canonical generation input is missing, invalid, or stale beyond the declared policy
- **THEN** the corresponding global registry evaluation follows its declared fallback and reports the dependency/freshness reason
- **AND** Card Data does not fabricate a zero or read a CL/KN site evaluation as a substitute
