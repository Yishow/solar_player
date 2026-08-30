## Context

See `proposal.md` for motivation. Derived calculations currently exist in several places: Display Story computes self-consumption/CO2 branches, Factory Circuit derives aggregates, multi-factory generation has a dedicated aggregate service, and Card Data diagnostics expose formula descriptions that are not an authoring source of truth. Calculation coefficients such as `carbonEmissionFactor`, `treeEquivalentFactor`, tariff, and household usage live in a singleton Calculation Settings service.

This design assumes `scope-live-metrics-by-site` provides scoped metric identities/MetricResolver and `add-widget-data-bindings` provides a metric catalog/binding consumer. The Registry itself remains usable by server story/readiness code even if the widget change is rolled out later.

## Goals / Non-Goals

**Goals:**

- Centralize derived metric identity, dependency graph, expression, scope, fallback, freshness, provenance, and materialization.
- Make formula evaluation deterministic and non-executable outside a deliberately small arithmetic language.
- Support per-site formulas and explicit global/cross-site formulas without implicit scope fallback.
- Reuse controlled Calculation Settings values as typed, traceable formula inputs where needed.
- Preserve externally observable first-party formula results/completeness policies during migration.
- Provide management validation/preview APIs that the later Data Hub can surface.

**Non-Goals:**

- No JavaScript `eval`, Function constructor, SQL expressions, shell commands, network/file access, scripting, loops, or user-defined code/functions.
- No formula expression stored directly in page/widget config.
- No general-purpose unit-conversion language or arbitrary custom units in the first version.
- No historical time-series formula language/window functions.
- No replacement of Calculation Settings CRUD; the registry reads an allowlisted typed projection of those settings.

## Decisions

### Persist definitions separately from materialized readings

Use normalized registry tables conceptually equivalent to:

```text
derived_metric_definitions
  metric_key PRIMARY KEY
  output_scope_policy   site | global
  expression
  output_unit
  precision
  fallback_policy       unavailable | retain-last-good
  enabled
  revision
  name / description
  created_at / updated_at

derived_metric_inputs
  derived_metric_key
  alias
  input_kind            metric | calculation-setting
  metric_key?           semantic key
  scope_selector?       output-site | cl | kn | global
  setting_key?          allowlisted key
  sort_order
  PRIMARY KEY(derived_metric_key, alias)
```

Materialized derived values use the same scoped `live_metric_values` storage as other semantic metrics, with provenance/source classification identifying Registry ownership. Definitions are not duplicated per CL/KN; `output_scope_policy = site` evaluates the same definition independently for both scopes.

Alternative: store one JSON blob per definition. Rejected because normalized inputs make dependency graph queries, uniqueness, cycle validation, migrations, and diagnostics clearer. A versioned JSON representation may still be used in API DTOs.

### Compile definitions into an immutable validated registry snapshot

On startup and after successful management mutation, load enabled definitions and compile them into an immutable in-memory registry snapshot:

```text
CompiledDefinition
  metricKey
  outputScopePolicy
  parsed AST
  input descriptors
  direct dependency nodes
  topological rank
  output unit metadata
  fallback policy
  revision
```

Validation occurs against the complete proposed registry before transaction commit/activation. Successful mutation writes definitions/inputs atomically, increments definition/registry revision, builds a new compiled snapshot, then swaps it in. A failed mutation leaves both DB active state and runtime snapshot unchanged.

Alternative: parse expression on every MQTT update. Rejected for performance, inconsistent validation, and failure isolation.

### Implement a dedicated tokenizer/parser/AST, never general-purpose eval

The grammar is deliberately small:

```text
expression  := additive
additive    := multiplicative (("+" | "-") multiplicative)*
multiplicative := unary (("*" | "/") unary)*
unary       := ("+" | "-") unary | primary
primary     := NUMBER | IDENTIFIER | "(" expression ")" | FUNCTION "(" arguments ")"
FUNCTION    := sum | avg | min | max
```

Identifiers are input aliases only. Function arity: `sum/avg/min/max` require at least one argument. Parser limits should bound expression length, token count, nesting depth, and argument count to prevent pathological CPU/memory usage; proposed initial limits are 512 characters, 256 tokens, nesting depth 32, and 64 function arguments. These are implementation guardrails rather than product-visible formula features and can be tightened without changing valid normal formulas.

Evaluation walks the AST with finite-number checks after each operation. Division checks denominator zero before division. No dynamic property lookup exists.

Alternative: adopt a full scripting/expression package. Rejected initially because the required grammar is small, the attack surface matters, and a custom AST lets us attach unit/provenance metadata per node. A vetted parser library can be reconsidered only if it implements exactly this constrained capability surface without code execution.

### Treat input scope as a definition property, not expression syntax

Expressions reference aliases such as `self`, `consumption`, `clToday`, `knToday`. Scope is declared on each metric input descriptor:

```text
self -> selfConsumptionEnergy / output-site
clToday -> factoryGeneration.todayMwh / cl
knToday -> factoryGeneration.todayMwh / kn
```

`output-site` is rejected on global definitions. Site definitions can only be evaluated for `cl` or `kn`; explicit `cl|kn|global` inputs remain fixed regardless of output site. There is no implicit “find whichever site has a value.”

This keeps formulas readable and prevents expression authors from constructing scope strings dynamically.

### Expose an allowlisted Calculation Settings input registry

Create a small adapter that maps approved calculation settings to numeric typed inputs. Initial allowlist should include only settings needed by migrated calculations, with explicit unit metadata, for example:

```text
carbonEmissionFactor      numeric, mass/energy (current semantics: kg CO2e per kWh)
treeEquivalentFactor      numeric, existing tree-equivalent semantics
householdDailyUsageKwh    numeric, kWh/day
householdMonthlyUsageKwh  numeric, kWh/month
estimatedTariffPerKwh     numeric, currency/kWh only if a migrated formula needs it
```

`co2AutoConvertSmallToKg` is a display preference, not a numeric formula input, and remains outside the expression input allowlist unless a future capability explicitly needs boolean conditionals (which this grammar does not support).

The setting adapter returns value, unit/type, and calculation-settings update/revision metadata. It never exposes DB column names, arbitrary keys, secrets, or environment variables.

Alternative: copy coefficient values as numeric literals into each formula. Rejected because operator settings would stop affecting calculations and provenance could not explain which coefficient was used.

### Use bounded unit-family analysis, not an unrestricted unit algebra system

Maintain a registry of the application's known units/families and conversion scales (power, energy, mass/CO2, percent/dimensionless, hours/time, currency as needed). AST validation propagates dimension families:

- `+`, `-`, `sum`, `avg`, `min`, `max`: operands must be compatible dimensions; numeric literals may only combine additively with dimensionless values.
- `*` and `/`: combine dimensions algebraically.
- Division of equal dimensions yields dimensionless.
- Output unit must be compatible with the inferred output dimension. Scale conversion can be expressed numerically (for example kg→t division by 1000) while the declared output unit remains in the same mass dimension.

This catches obvious `kW + kWh` mistakes without attempting a scientific-units DSL. Unknown/non-registered units in authorable definitions are rejected; repository migration can add known units explicitly first.

Alternative: ignore units entirely. Rejected because management-authored formulas would silently permit category errors.

### Evaluate a dependency DAG on metric or setting changes

Build dependency edges from scoped derived definition instances conceptually. A site definition produces two potential nodes (`cl/key`, `kn/key`); a global definition produces one. Edges resolve input scope selectors. Validate no cycles across the expanded scope graph.

On a source metric update:

1. update the scoped source reading,
2. identify directly affected derived nodes through a reverse dependency index,
3. evaluate affected nodes in topological order,
4. materialize changed accepted values/status/provenance,
5. cascade to downstream nodes,
6. emit scoped live/history/story invalidation through existing runtime mechanisms.

On a calculation setting update, use the same reverse index for setting inputs. Batch multiple affected nodes against one consistent source snapshot/registry revision.

Derived evaluation is synchronous to the server event pipeline for the current scale; if workloads grow substantially, the same DAG can later be queued without changing the external contract.

### Distinguish evaluation status from last materialized numeric value

A derived runtime record/result carries both last accepted value and current evaluation status/provenance. `retain-last-good` can keep a numeric reading but mark evaluation `degraded` with reason/dependency failures and original last-good timestamp. It must not stamp “now” or claim `good/live` freshness.

`unavailable` returns no usable current value through the resolver when required dependencies/evaluation fail, even if historical materialization exists for diagnostics.

This distinction is necessary to preserve existing CL+KN “last complete value” behavior without lying about current completeness.

### Make freshness/provenance part of the evaluator result

Each metric input contributes value, scope, timestamp, freshness, and provenance. Valid derived timestamp is `min(metricDependency.timestamps)`. Worst freshness is resolved using the existing shared freshness ordering. Setting inputs contribute registry/settings revision metadata but do not improve the metric timestamp.

Provenance forms a bounded tree/DAG reference structure rather than unbounded copied nested JSON. API diagnostics can expand it to a configured depth and de-duplicate repeated nodes. Persisted reading provenance records the definition revision and direct dependency identities/timestamps; detailed transitive source lookup can be reconstructed from current/history diagnostics.

### Migrate first-party formulas as seeded immutable-by-default definitions

Seed repository-owned derived definitions for at least:

- `selfConsumptionRatio` (site),
- `todayCo2Reduction` / `totalCo2Reduction` and other current first-party CO2 metrics as applicable (site/global according to existing story semantics),
- Factory Circuit total/aggregate metrics (site),
- canonical CL+KN `todayGeneration`, `monthGeneration`, `totalGeneration` (global).

Sustainability's three derived big numbers are the explicit first-party CO2 extension in this change. The public story fields and card IDs remain the existing `accumulatedCarbonReductionTons`, `annualEnergySavingPercent`, and `plantedTreeEquivalent`; registry identities are scope-qualified so the site story and management Card Data can retain their existing scope semantics without allowing duplicate definitions for one `metricKey`:

| Registry key | Output scope | Inputs and expression | Output contract | Fallback |
| --- | --- | --- | --- | --- |
| `sustainability.site.accumulatedCarbonReductionTons` | `site` (`cl`/`kn`) | `factoryGeneration.totalMwh` at `output-site` in `MWh` and `carbonEmissionFactor` in `kg/kWh`; `generation * carbonFactor` | `t`, precision 3 | `unavailable` |
| `sustainability.site.annualEnergySavingPercent` | `site` (`cl`/`kn`) | `selfConsumptionEnergy` and `consumptionEnergy` at `output-site` in `kWh`; `self / consumption * 100` | `%`, precision 1 | `unavailable` |
| `sustainability.site.plantedTreeEquivalent` | `site` (`cl`/`kn`) | the same-site accumulated-carbon definition in `t`; `co2 * 6.25` | `trees`, precision 0 | `unavailable` |
| `sustainability.global.accumulatedCarbonReductionTons` | `global` | global canonical `totalGeneration` in `MWh` (including the existing CL+KN aggregate/cumulative fallback) and `carbonEmissionFactor` in `kg/kWh`; `generation * carbonFactor` | `t`, precision 3 | `retain-last-good` |
| `sustainability.global.annualEnergySavingPercent` | `global` | global `selfConsumptionEnergy` and `consumptionEnergy` values supplied by the existing cumulative-counter adapter/live fallback in `kWh`; `self / consumption * 100` | `%`, precision 1 | `unavailable` |
| `sustainability.global.plantedTreeEquivalent` | `global` | the same-global accumulated-carbon definition in `t`; `co2 * 6.25` | `trees`, precision 0 | `unavailable` |

The registry's scale conversion preserves the current CO2 calculation: generation in MWh multiplied by kg/kWh yields tonnes after normalization. Sustainability tree output deliberately uses the shared `co2TreeEquivalentFactor` value `6.25`, after the accumulated CO2 result has been rounded to three decimals, then rounds the tree count with `Math.round`. The existing Calculation Settings `treeEquivalentFactor` field is currently unused by this formula and remains outside this behavior switch; it must not be wired as a formula input or silently change the compatibility result. `co2AutoConvertSmallToKg` remains display-only.

The site route resolves the site-qualified definitions from trusted device context. Site annual saving has no implicit global-counter fallback: with the current site fixtures and source contract its missing site inputs produce a registry `unavailable` result, which the story exposes as the existing `null`. The global management Card Data path resolves the global-qualified definitions and keeps the current global counter/live fallback, including a calculable global annual saving value. Story field names, Card Data row/card IDs, metric binding/widget configuration, display formatting, and units remain unchanged; only their registry evaluation source and diagnostics become canonical.

First-party definitions are editable through management only if existing product intent allows changing their formulas; otherwise mark formula structure managed/read-only while exposing coefficients through Calculation Settings. The initial implementation should default safety-critical/canonical definitions to managed/read-only and allow creation/editing of operator-defined derived keys in a reserved custom namespace (for example `custom.*`). This prevents an operator accidentally rewriting canonical system semantics while still delivering formula authoring.

If the product later wants canonical formula editing, that is a deliberate capability expansion.

Alternative: make every seeded formula freely editable immediately. Rejected because changing canonical generation/CO2 readiness semantics could invalidate existing specs throughout the product.

### Preserve cumulative regression validation as a post-evaluation acceptance policy

Some derived metrics need domain acceptance checks beyond arithmetic. Canonical cumulative generation retains the existing cumulative regression/reset guard as a registered acceptance policy applied after formula evaluation and before materialization. The expression still computes CL+KN sum; the policy decides whether the new cumulative result is acceptable.

The initial acceptance-policy registry is internal/allowlisted and not an operator-authored script surface.

### Fail soft on stored registry compilation

Startup compilation and mutation validation have different failure contracts. A mutation validates a *proposed* state the operator can still correct interactively, so it stays strict and all-or-nothing. Startup compiles an *already stored* state that may have been invalidated by unrelated edits — deleting a topic mapping removes a metric key that a stored custom definition still references — and there is no interactive operator in that path. Compilation therefore partitions definitions into compiled and excluded sets, activates the compiled set, and records each exclusion with its definition key and validation reason. `buildApp()` must not be able to fail on stored-definition validity, or the only surface capable of repairing the definition becomes unreachable.

Excluded definitions are reported through the management registry read model so an operator can see why a definition stopped evaluating rather than discovering it as a blank card.

### Retire disabled definitions from storage

Disabling filters a definition out of the compiled registry, which means the evaluator stops visiting it — it does not mean the definition's outputs disappear. Stored evaluation rows and materialized `live_metric_values` rows outlive the definition's active life and keep being read by consumers, which have no `enabled` predicate of their own. Deactivation therefore owns cleanup: the same transaction that flips the flag deletes the definition's evaluations and materialized readings for every scope it produced.

The scoped metric key stays reserved while the definition row exists. Identity-conflict validation for source topic mappings considers all stored definitions, not only enabled ones, so disabling cannot be used as a back door to bind a raw topic to a canonical derived key.

### Normalize unit case and scale

Two separate defects share one root cause: unit handling compares dimension but ignores magnitude, and matches unit strings literally.

Validation gains a scale comparison alongside the existing dimension comparison. Where the declared output unit and the inferred result unit share a dimension but differ in scale, evaluation applies the conversion factor; where they cannot be reconciled, the definition is rejected. `todayCo2Reduction` currently produces correct numbers only because MWh→kWh and kg→t happen to cancel, which is an accident of the seeded formula rather than a property of the engine.

Input resolution normalizes unit strings case-insensitively against the known-unit table before lookup. A reading with no recorded unit resolves as invalid input rather than being adopted into the declared unit — topic mappings permit a null unit, and silently treating an unlabelled magnitude as the declared one publishes a wrong number instead of an honest failure.

### Restrict per-site aggregates to declared sites

`outputScopePolicy: "site"` expands a definition across every site, which is right for `selfConsumptionRatio` and wrong for the Factory Circuit totals: those definitions are per-site by construction, one naming Jungli's slot set and one naming Guanyin's. Expanding both across both sites produces a KN aggregate published under the Jungli key and a permanently unavailable CL Guanyin node that reissues a delete on every evaluation.

A site definition may therefore declare the sites it evaluates for. Omitting the declaration keeps today's evaluate-everywhere behavior, so only definitions that are genuinely per-site carry the restriction.

### Drive evaluation from the reverse dependency index

`compileRegistry` already builds `reverseMetricDependencies` and `reverseSettingDependencies`, and the ingestion path never uses them: every inbound MQTT message re-evaluates and rewrites the whole registry. Ingestion switches to looking up the changed metric key in the reverse index, walking transitively to the affected node set, and evaluating only those nodes in topological order. The consistency contract is unchanged — the affected batch still evaluates against one snapshot — but the work becomes proportional to the change rather than to registry size.

### Page staleness policy overrides registry aggregates

The registry has no notion of `allowStaleRuntimeData`; it is a page-level presentation policy, and staleness is not a registry evaluation failure. When the Factory Circuit total-power KPI began reading its value from the registry evaluation, it stopped consulting the per-slot usability check that the surrounding slot cards still apply. The result is a page that rejects stale data everywhere except its headline number.

The aggregate KPI keeps its own gate: the registry supplies the value, and the page's staleness policy decides whether that value may be rendered. Aggregate and slot cards derive their fallback from the same evaluation of the same dependencies.

### Validate preview drafts before evaluating

Preview accepts a draft body from the management client and spreads it directly into a definition shape, so a malformed payload dereferences undefined and escapes as an unhandled error. Preview runs the same structural validation as save before evaluating anything, and reports validation failures as structured client errors. Preview stays non-activating; only its input handling changes.

### Resolve dependency status from resolution, not topic mappings

Card diagnostics infer dependency status from the presence of a `sourceTopic`, which is populated only from `topic_mappings`. Managed-adapter metrics have no mapping row by design — migration `036` removed the managed Solar mappings — so a healthy, flowing dependency reports `missing-topic` forever. Status is derived from whether the dependency resolves to a usable reading; the topic remains a provenance detail shown when one exists.

## Risks / Trade-offs

- [Risk] Formula engine becomes a hidden programming language → grammar/limits are deliberately small, parser is AST-based, and no control flow/property/code execution is available.
- [Risk] DAG cycle can cross scopes and be missed by metric-key-only validation → expand definitions into site/global nodes for cycle detection and test cross-scope cycles explicitly.
- [Risk] Setting changes trigger inconsistent half-old evaluations → compile one registry revision and evaluate an affected batch against one settings/metric snapshot.
- [Risk] `retain-last-good` makes stale values look current → track evaluation status separately, preserve last-good timestamp, and derive freshness from failed/current dependencies.
- [Risk] Unit validation is either too weak or too ambitious → support only known application unit families and basic algebra required by migrated formulas; reject unknown authorable units.
- [Risk] Operators break canonical metrics → seed canonical definitions as managed/read-only initially; custom formula authoring uses a reserved custom namespace.
- [Risk] Provenance trees explode for nested formulas → persist direct references/revisions and expand transitive provenance with de-duplication/depth bounds.
- [Trade-off] Fail-soft startup compilation can serve a partially compiled registry → each exclusion is logged with its reason and surfaced in the management read model, and mutations stay strict so invalid state cannot be introduced interactively.
- [Risk] Unit scaling changes could shift already-correct migrated outputs → parity fixtures cover the seeded CO2 definitions specifically, since their current correctness depends on cancelling scale factors.
- [Trade-off] Materialized derived values duplicate recomputable state → accepted for current Socket/history/readiness compatibility and fast reads; registry revision/provenance makes recomputation traceable.

## Migration Plan

1. Add shared derived definition/evaluation/validation DTOs, known unit metadata, parser grammar tests, malicious/disallowed syntax tests, and scope-expanded cycle tests.
2. Add definition/input persistence migration and compile an empty/seeded registry snapshot without changing current page calculations.
3. Implement AST evaluator, unit validation, metric/Calculation Settings input resolvers, DAG/reverse dependency index, materialization status/provenance, and fallback tests.
4. Add management list/detail/create/update/preview APIs with full proposed-registry atomic validation; restrict canonical definitions to managed/read-only and operator-created definitions to the approved custom namespace.
5. Seed and dual-run/compare first-party self-consumption, site/global Sustainability CO2/tree definitions, Factory Circuit aggregate, and CL+KN generation definitions against current hardcoded implementations using recorded fixtures; fail rollout on value, unit, precision/rounding, freshness, fallback, scope, or completeness drift. The Sustainability fixtures must preserve site annual `unavailable`/`null`, global counter-backed annual calculation, and the shared literal tree factor `6.25`.
6. Migrate playback metric dependencies, freshness, Display Story, Sustainability story, Card Data diagnostics, and aggregate consumers to registry results without changing story field names, card IDs, or widget bindings, then delete the corresponding duplicated hardcoded formula branches only after regression tests are green.
7. Hook metric/settings changes into affected DAG evaluation and scoped live/history invalidation; verify multi-level derived updates are ordered and atomic from a consumer perspective.
8. Run focused calculation settings, Display Story, readiness/freshness, factory aggregation/regression, Card Data, Widget binding/catalog, management API security tests plus `git diff --check` and `pnpm verify`.

Rollback should restore the previous binary and database backup if the schema migration is not backward compatible. During rollout, hardcoded calculations should be removed only after registry-backed parity has been demonstrated; do not leave two active writers for the same canonical derived metric identity.

Migration `037_derived_metric_registry.sql` is forward-only: it adds registry tables and a Calculation Settings revision column. A previous binary can ignore the added tables/column, but an exact schema rollback requires restoring the pre-migration SQLite backup; do not drop registry tables from a live database as an ad-hoc rollback.
