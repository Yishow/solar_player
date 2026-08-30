## ADDED Requirements

### Requirement: Monitoring stories consume registry evaluation results for derived metrics

When a monitoring binding resolves to a registered derived metric, the story model SHALL use the registry evaluation result for value, output unit/precision, freshness, fallback reason, effective scope, and provenance. Story builders MUST NOT recompute the same formula independently from raw inputs.

#### Scenario: Self-consumption ratio is rendered
- **WHEN** a monitoring page binds to `selfConsumptionRatio`
- **THEN** the story uses the active registry evaluation for the effective site
- **AND** diagnostics expose its registered inputs and formula/provenance summary
- **AND** the page does not run a separate hardcoded ratio calculation

#### Scenario: Derived evaluation is degraded
- **WHEN** the registry reports a retained last-good value because a required dependency is unavailable
- **THEN** the story may display the retained value according to fallback policy
- **AND** freshness/fallback metadata identifies that the current evaluation is degraded rather than live

### Requirement: Sustainability stories select the scope-qualified registry result

When a Sustainability story is read with trusted device `siteScope`, its derived big numbers SHALL resolve the matching `sustainability.site.*` registry identities under that site. When the story is read without a device scope for the management/global Card Data path, it SHALL resolve the matching `sustainability.global.*` identities under `global`. The story SHALL map those evaluations back to the existing `accumulatedCarbonReductionTons`, `annualEnergySavingPercent`, and `plantedTreeEquivalent` fields without recomputing formulas or changing page/widget configuration.

#### Scenario: Site Sustainability story preserves unavailable annual saving
- **WHEN** a CL or KN story has no usable site self-consumption/consumption inputs
- **THEN** it reads `sustainability.site.annualEnergySavingPercent` as `unavailable`
- **AND** the public big-number value remains `null`
- **AND** no global counter is substituted

#### Scenario: Global Sustainability Card Data preserves counter-backed annual saving
- **WHEN** global cumulative counters provide self-consumption and consumption values
- **THEN** the story maps `sustainability.global.annualEnergySavingPercent` into the existing global big-number field
- **AND** its value, one-decimal formatting, freshness, and provenance remain compatible with the current global story

### Requirement: Registry-backed aggregates respect page staleness policy

When a page declares that stale runtime data is not acceptable, a KPI whose value comes from a registry-backed aggregate SHALL apply that policy to its own contributing dependencies. If any contributing dependency is unusable under the page's staleness policy, the aggregate KPI SHALL fall back consistently with the individual cards built from the same dependencies, rather than rendering a number computed from data the page has rejected.

#### Scenario: A contributing slot is stale on a page that rejects stale data
- **WHEN** a Factory Circuit page sets `allowStaleRuntimeData` to false and one contributing slot reading is stale
- **THEN** the total-power KPI falls back instead of rendering a computed value
- **AND** its fallback state and freshness match the slot cards built from the same dependencies
