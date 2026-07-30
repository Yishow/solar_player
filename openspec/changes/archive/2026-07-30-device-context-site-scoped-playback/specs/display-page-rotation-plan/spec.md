## ADDED Requirements

### Requirement: Evaluate rotation with Profile and Site context on the Server

Formal runtime rotation SHALL combine the assigned Profile, Context Site Scope, Site-scoped Readiness, and Site-scoped Freshness before returning effective pages. The Client SHALL NOT perform a second Site filter.

#### Scenario: Site-irrelevant page is configured in a shared Profile

- **WHEN** a shared Profile contains both CL and KN Factory Circuit pages
- **THEN** a CL runtime response excludes the KN page with a Site Scope diagnostic
- **AND** the Server response is the authoritative rotation used by the Client
