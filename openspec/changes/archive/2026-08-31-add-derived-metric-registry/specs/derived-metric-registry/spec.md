## Purpose

Defines a reusable, scope-aware registry and evaluation contract for calculated metrics so formulas, dependencies, freshness, fallback, and provenance are centralized instead of duplicated across pages and widgets.

## ADDED Requirements

### Requirement: Derived metrics have stable semantic identities and scope policies

Each enabled derived metric definition SHALL have a unique semantic `metricKey`, an output scope policy, registered inputs, expression, output unit, precision, fallback policy, and metadata. Output scope policy SHALL be either `site` or `global`:

- `site` SHALL allow the same definition to evaluate independently as `cl/<metricKey>` and `kn/<metricKey>`.
- `global` SHALL evaluate only as `global/<metricKey>`.

A derived metric key MUST NOT collide with an enabled raw/managed source metric that writes the same scoped identity.

#### Scenario: Self-consumption ratio is site-scoped
- **WHEN** `selfConsumptionRatio` is registered with output scope policy `site`
- **THEN** CL and KN evaluations use the same semantic metric key
- **AND** their values remain distinct under `cl` and `kn` metric scopes

#### Scenario: Multi-factory generation is global
- **WHEN** a CL+KN generation definition is registered with output scope policy `global`
- **THEN** it materializes only under `global`
- **AND** it does not overwrite either site's source generation metrics

### Requirement: Metric inputs use explicit scope selectors

A derived metric input that references another metric SHALL declare an alias, semantic metric key, and scope selector. Scope selector SHALL be one of `output-site`, `cl`, `kn`, or `global`. `output-site` is valid only for a `site` output definition and resolves to the site currently being evaluated.

#### Scenario: Site ratio follows its output site
- **WHEN** a CL `selfConsumptionRatio` definition uses `output-site` inputs for self-consumption and consumption energy
- **THEN** both inputs resolve under CL
- **AND** the evaluator does not silently use KN or global readings

#### Scenario: Global aggregate names both factory inputs
- **WHEN** a global generation definition requires CL and KN generation
- **THEN** one input explicitly selects `cl` and the other explicitly selects `kn`
- **AND** neither dependency is inferred from evaluation order or the last updated site

### Requirement: Derived inputs may use allowlisted calculation settings

The registry MAY expose an allowlisted set of typed Calculation Settings values as derived inputs. A setting input SHALL identify a registered setting key and its declared unit/type; arbitrary application configuration paths, environment variables, secrets, or database fields MUST NOT be addressable as formula inputs.

#### Scenario: CO2 formula uses the configured carbon factor
- **WHEN** a CO2 derived metric references the registered carbon-emission-factor calculation setting
- **THEN** evaluation uses the current authorized calculation setting value
- **AND** provenance identifies that setting dependency
- **AND** the formula does not need to embed an untraceable magic factor

#### Scenario: Formula references an unregistered setting
- **WHEN** a definition attempts to reference a setting key outside the derived-input allowlist
- **THEN** validation rejects the definition
- **AND** runtime cannot read that setting through the formula engine

### Requirement: Derived definitions form an acyclic dependency graph

Enabled derived metric definitions SHALL form a directed acyclic graph after metric and setting dependencies are resolved. Direct self-reference and indirect cycles MUST be rejected before a definition becomes active.

#### Scenario: Direct cycle is submitted
- **WHEN** metric `a` declares itself as an input
- **THEN** validation rejects the definition with a cycle error
- **AND** the previous active registry remains unchanged

#### Scenario: Indirect cycle is introduced
- **WHEN** `a` depends on `b`, `b` depends on `c`, and a proposed change makes `c` depend on `a`
- **THEN** validation rejects the proposed registry state
- **AND** no cyclic definitions are activated

### Requirement: Evaluation is triggered from dependency changes and is deterministic

When a source or derived dependency changes, enabled downstream derived metrics SHALL be evaluated in dependency order using one consistent dependency snapshot. A definition with unchanged effective inputs MAY avoid rematerialization, but repeated evaluation of the same inputs and definition SHALL produce the same result. Evaluation SHALL be scoped through the compiled reverse dependency index to the nodes that transitively depend on the changed metric or setting, rather than recomputing and rewriting every node in the registry on each change.

#### Scenario: Source update affects two derived levels
- **WHEN** a source metric changes and derived metric A depends on it while derived metric B depends on A
- **THEN** A is evaluated before B
- **AND** B uses the newly evaluated A result rather than a mixture of old and new dependency values

#### Scenario: A single source metric is ingested
- **WHEN** one source metric arrives and only two definitions transitively depend on it
- **THEN** only those definitions are re-evaluated and rewritten
- **AND** definitions with no dependency on that metric are neither recomputed nor rewritten

### Requirement: Missing and invalid inputs follow an explicit fallback policy

Each derived metric SHALL declare a fallback policy of `unavailable` or `retain-last-good`.

- `unavailable` SHALL produce an unavailable evaluation when any required input is unavailable, invalid, or when expression evaluation fails safely.
- `retain-last-good` SHALL preserve the last valid materialized reading while reporting the current evaluation as degraded and identifying the failed dependency/reason.

Neither policy SHALL fabricate zero, infinity, NaN, or a value from another scope.

#### Scenario: Denominator is zero
- **WHEN** a derived expression divides by an input whose evaluated value is zero
- **THEN** evaluation reports a divide-by-zero error/degraded state
- **AND** the materialized result follows the definition's fallback policy
- **AND** no `Infinity` or `NaN` reading is published

#### Scenario: KN dependency is missing for global aggregate
- **WHEN** a global aggregate uses `retain-last-good`, CL is current, and required KN input is unavailable
- **THEN** the previous valid global reading remains materialized
- **AND** diagnostics identify KN as the blocking dependency

### Requirement: Derived freshness and timestamp reflect the complete dependency set

A valid derived reading SHALL use the worst freshness state among all metric dependencies and a timestamp no newer than the oldest metric dependency that contributed to the value. Calculation-setting inputs SHALL carry their current configuration revision/update metadata in provenance but SHALL NOT make an old live metric appear fresher.

#### Scenario: One ratio input is stale
- **WHEN** self-consumption energy is live and consumption energy is stale
- **THEN** `selfConsumptionRatio` is stale
- **AND** its effective timestamp is no newer than the stale dependency timestamp

### Requirement: Derived provenance is transitive and diagnosable

A derived evaluation SHALL expose its definition identity/revision, effective output scope, expression summary, direct inputs, effective input scopes, and transitive source provenance sufficient to trace metric inputs to managed adapters or MQTT topics where available. Provenance MUST NOT expose secrets from calculation settings or source credentials.

#### Scenario: Operator inspects a two-level derived metric
- **WHEN** derived metric B depends on derived metric A and A depends on an MQTT-backed metric
- **THEN** diagnostics show B → A → source metric → source topic/adapter provenance
- **AND** each dependency's effective scope and freshness are visible

### Requirement: First-party hardcoded formulas migrate without output drift

The first registry migration SHALL cover at least self-consumption ratio, CO2 reduction metrics, Factory Circuit power aggregates, and CL+KN canonical generation. For the same valid inputs and configuration, migrated definitions SHALL preserve the existing externally observable value, unit, precision/fallback behavior, and completeness rules unless an accompanying delta spec explicitly changes them.

#### Scenario: Existing self-consumption inputs are replayed
- **WHEN** pre-migration and registry-backed implementations evaluate the same valid self-consumption and consumption inputs
- **THEN** the displayed/resulting ratio is equivalent within the existing precision contract
- **AND** readiness/freshness behavior remains compatible

### Requirement: Sustainability first-party metrics retain scoped compatibility identities

The first-party Sustainability big-number outputs SHALL use these managed/read-only registry identities in addition to the existing canonical monitoring keys:

- `sustainability.site.accumulatedCarbonReductionTons`, `sustainability.site.annualEnergySavingPercent`, and `sustainability.site.plantedTreeEquivalent` SHALL be `site` definitions and evaluate independently under `cl` and `kn`.
- `sustainability.global.accumulatedCarbonReductionTons`, `sustainability.global.annualEnergySavingPercent`, and `sustainability.global.plantedTreeEquivalent` SHALL be `global` definitions and evaluate only under `global`.

The site accumulated-carbon definition SHALL use `factoryGeneration.totalMwh` at `output-site` plus the registered `carbonEmissionFactor`, output `t`, and preserve the existing three-decimal rounding and `unavailable` behavior when the site aggregate is missing or unusable. The site annual-saving definition SHALL use only site `selfConsumptionEnergy` and `consumptionEnergy`, output `%` with one decimal place, and use `unavailable` when those inputs are absent; it MUST NOT substitute global counters, so the current site story continues to expose `null`. The site tree definition SHALL consume the same-site accumulated-carbon result after its three-decimal rounding, multiply by the shared first-party factor `6.25`, output a tree count with integer rounding, and use `unavailable` when the carbon result is unavailable.

The global accumulated-carbon definition SHALL use the global canonical total-generation result and its existing CL+KN aggregate/cumulative fallback with the registered `carbonEmissionFactor`, output `t` with three-decimal rounding, and retain the existing last-good behavior when the global aggregate is temporarily unavailable. The global annual-saving definition SHALL use global cumulative-counter values with the existing live-metric fallback for `selfConsumptionEnergy` and `consumptionEnergy`, output `%` with one decimal place, and return `unavailable` for missing or non-positive consumption. The global tree definition SHALL consume the same-global accumulated-carbon result and apply the same literal `6.25` factor and integer rounding.

The Calculation Settings `treeEquivalentFactor` value is not an input to these definitions because the current implementation uses the shared `co2TreeEquivalentFactor` value `6.25`; this change SHALL NOT activate or reinterpret that currently unused setting. `co2AutoConvertSmallToKg` SHALL remain display-only. All six definitions SHALL carry the worst dependency freshness and oldest contributing timestamp; settings revision/provenance MUST NOT freshen an old metric. Missing, invalid, zero-denominator, or non-finite inputs SHALL follow the declared fallback without fabricating zero, `NaN`, or `Infinity`.

#### Scenario: Site and global Sustainability identities remain distinct
- **WHEN** the site story resolves a CL or KN device context and Card Data resolves its management-wide global context
- **THEN** the story evaluates the corresponding `sustainability.site.*` identity under that site and Card Data evaluates the corresponding `sustainability.global.*` identity under `global`
- **AND** neither path reads the other scope's value
- **AND** the existing story big-number property names, Card Data row/card IDs, and widget metric bindings remain unchanged

#### Scenario: Site annual saving remains unavailable without site inputs
- **WHEN** a site story has no usable site self-consumption or consumption input
- **THEN** `sustainability.site.annualEnergySavingPercent` reports `unavailable`
- **AND** the story returns the existing `null` value with missing freshness/provenance
- **AND** global cumulative counters are not used as a fallback

#### Scenario: Global annual saving uses the existing counter path
- **WHEN** global cumulative counters contain self-consumption and consumption values
- **THEN** `sustainability.global.annualEnergySavingPercent` evaluates their ratio with one-decimal rounding
- **AND** the result remains calculable even when the live fallback rows have not been populated

#### Scenario: Tree equivalence preserves the shared factor
- **WHEN** a valid accumulated-carbon result is rounded to three decimals
- **THEN** the corresponding site or global tree definition multiplies that rounded value by `6.25`
- **AND** rounds the tree count to an integer
- **AND** changing the currently unused Calculation Settings `treeEquivalentFactor` does not change this result

### Requirement: Disabling a derived metric retires its evaluation and materialized value

Disabling a derived metric definition SHALL, within the same transaction that persists the definition state, remove that definition's stored evaluations and any materialized live readings it wrote for every scope it previously evaluated. Evaluation and definition reads used by playback, story, and card diagnostics SHALL NOT return results for a disabled definition. A disabled definition SHALL still participate in raw-source identity-conflict validation, so its semantic key cannot be reused by a source topic mapping while the definition exists.

#### Scenario: Operator disables an active derived metric
- **WHEN** an operator disables a derived metric that has already materialized a value
- **THEN** its stored evaluation and materialized scoped reading are removed
- **AND** consumers report the metric as unbound instead of serving the last computed value indefinitely

#### Scenario: Source mapping reuses a disabled derived key
- **WHEN** an operator disables a derived metric and then maps a raw source topic to the same scoped metric key
- **THEN** identity-conflict validation still rejects the mapping
- **AND** no retired derived value can shadow the raw reading

### Requirement: Registry compilation failures degrade without blocking service startup

Compiling the stored registry at startup SHALL be fault-tolerant. When a stored definition fails validation with an unknown input, metric key conflict, or dependency cycle, compilation SHALL exclude only the failing definitions, activate the remaining valid registry, and record a structured diagnostic naming each excluded definition and its reason. Service startup MUST NOT fail because a stored derived definition became invalid. Explicit create/update/enable/disable mutations remain strict and SHALL still reject an invalid proposed state in full.

#### Scenario: A stored definition's input disappears before restart
- **WHEN** a definition references a metric that no longer exists because its topic mapping was deleted, and the service restarts
- **THEN** the service starts successfully with that definition excluded and reported as invalid
- **AND** management surfaces remain reachable so an operator can repair or disable the definition

#### Scenario: Operator submits an invalid definition while the service is running
- **WHEN** a management mutation proposes a registry state containing an unknown input
- **THEN** the mutation is rejected
- **AND** the previously compiled registry continues to evaluate unchanged

### Requirement: Metric input units are normalized before evaluation

Metric input resolution SHALL match and convert units case-insensitively across the registered known-unit set. A stored reading with no recorded unit MUST NOT be assumed to already match the input's declared unit; such an input SHALL resolve as invalid and follow the definition's fallback policy.

#### Scenario: Reading is stored with a differently cased unit
- **WHEN** a live reading is stored with unit `kwh` and the input declares `kWh`
- **THEN** the value resolves and converts normally
- **AND** the definition does not fail with an invalid-input error

#### Scenario: Reading has no recorded unit
- **WHEN** a live reading carries no unit and the input declares `MWh`
- **THEN** the input resolves as invalid and the definition follows its fallback policy
- **AND** the raw magnitude is not consumed as if it were already in the declared unit

### Requirement: Site-scoped definitions declare which sites they evaluate

A `site` output-scope definition SHALL be able to declare the subset of sites it evaluates for. Sites outside that declaration SHALL NOT be evaluated, materialized, or repeatedly cleared by the evaluator. A definition that omits the declaration SHALL continue to evaluate for every site.

#### Scenario: Per-site aggregate is restricted to its own site
- **WHEN** a Factory Circuit total-power definition declares CL as its only evaluated site
- **THEN** the registry evaluates and materializes it only under CL
- **AND** no KN evaluation, materialization, or repeated delete is issued for that definition
