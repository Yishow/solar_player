## ADDED Requirements

### Requirement: Display Client Context scopes all formal playback metric families

The system SHALL use the resolved Display Client Context Site Scope consistently as the default scope for formal playback live metrics, monitoring history, page-scoped stories, freshness, and data-derived readiness. Explicitly global metrics MAY be included when required by the page contract. A trusted server-authored published binding MAY explicitly select another metric scope for that bound value, but a metric from another site MUST NOT be used as an implicit substitute for a missing inherited-site metric.

#### Scenario: CL device reads a monitoring page
- **WHEN** a paired device in a `cl` Group requests a monitoring playback page and its runtime data
- **THEN** inherited bindings resolve page value, freshness, trend/history, and provenance from CL-scoped inputs plus any explicitly global dependencies
- **AND** no KN-scoped input is used as a fallback for a missing CL metric
- **AND** any KN value present on the page must come from a trusted binding that explicitly selects KN scope

#### Scenario: Site-specific data is missing
- **WHEN** a KN playback context requires a KN-scoped metric that is missing while the corresponding CL metric is healthy
- **THEN** the KN page reports the existing degraded or unavailable state for the KN dependency
- **AND** the system SHALL NOT fill the gap with the CL reading
