## ADDED Requirements

### Requirement: Derived freshness follows registry dependency evaluation

For a registered derived metric, page freshness SHALL use the Derived Metric Registry evaluation result and its actual resolved metric dependencies. The derived freshness state SHALL be no better than the worst dependency freshness, and its effective timestamp SHALL be no newer than the oldest metric dependency that contributed to the value.

#### Scenario: One dependency is stale
- **WHEN** a derived metric has one live dependency and one stale dependency
- **THEN** the derived metric is stale
- **AND** the live dependency's newer timestamp SHALL NOT make the derived metric appear fresh

#### Scenario: Registry fallback retains last good value
- **WHEN** a derived metric uses `retain-last-good`, a current dependency becomes unavailable, and the last materialized value remains displayed
- **THEN** freshness/readiness identify the current evaluation as degraded or unavailable according to the registry result
- **AND** the retained numeric value SHALL NOT be reported as freshly recomputed
