## ADDED Requirements

### Requirement: Readiness checks are scoped to the Display Client Site

Runtime Readiness SHALL evaluate only source requirements that apply to the authenticated Context Site Scope. Management previews SHALL identify the explicitly previewed Site and SHALL keep CL and KN findings separate.

#### Scenario: KN data is stale while a CL Device is ready

- **WHEN** CL required sources are ready and KN required sources are stale
- **THEN** CL runtime Readiness reports ready
- **AND** the KN stale condition does not skip CL pages
