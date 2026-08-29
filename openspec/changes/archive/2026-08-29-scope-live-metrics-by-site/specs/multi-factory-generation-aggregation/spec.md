## ADDED Requirements

### Requirement: Canonical multi-factory generation is explicitly global

The canonical generation values derived from complete CL and KN factory sources SHALL use `metricScope = global`. CL and KN source generation SHALL remain independently addressable under their own scopes and MUST NOT be overwritten when the global aggregate is updated.

#### Scenario: Both factory summaries are current
- **WHEN** current CL and KN generation inputs satisfy the existing completeness rules
- **THEN** the system updates the canonical aggregate under `global`
- **AND** the CL and KN source metrics remain available under `cl` and `kn` respectively

#### Scenario: A site playback page requests generation
- **WHEN** a CL playback binding targets site-scoped generation
- **THEN** it resolves the CL value rather than the global CL+KN aggregate
- **AND** the global aggregate is used only by a contract that explicitly requests global scope

### Requirement: Aggregate completeness is evaluated across scoped source identities

The existing complete-both-sites and last-complete-value rules SHALL evaluate CL and KN as two explicit scoped inputs. A reading from one site MUST NOT satisfy the other site's dependency merely because both inputs share the same semantic metric key.

#### Scenario: KN source is stale while CL is current
- **WHEN** the CL source identity is current and the KN source identity is stale
- **THEN** the global aggregate is not recomputed from CL alone
- **AND** the last complete global value is retained according to the existing aggregation contract
