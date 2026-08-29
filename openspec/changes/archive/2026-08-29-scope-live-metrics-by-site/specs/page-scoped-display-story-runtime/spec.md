## ADDED Requirements

### Requirement: Page-scoped stories resolve all metric facets from one effective scope

A page-scoped monitoring story SHALL resolve displayed value, source value, freshness, fallback state, provenance, trend/history references, and display override from the same effective metric scope. A story MUST NOT combine a value from one site with freshness, source topics, history, or override state from another site.

#### Scenario: CL Overview story is built
- **WHEN** a CL display requests the `overview` story
- **THEN** every site-dependent story metric resolves from CL-scoped inputs
- **AND** each metric's freshness and provenance describe those same CL-scoped inputs

#### Scenario: Global dependency is part of a site story
- **WHEN** a page contract explicitly declares a global dependency for a CL or KN story
- **THEN** the story MAY include that global dependency
- **AND** its provenance SHALL identify the dependency scope as `global` rather than relabeling it as the device site
