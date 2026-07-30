## ADDED Requirements

### Requirement: Page-scoped Story runtime enforces Display Client Context

Page-scoped Story runtime endpoints SHALL resolve Site-sensitive sources from the authenticated Display Client Context. A page identifier SHALL NOT authorize access to another Site's data.

#### Scenario: CL Device requests the KN Factory Circuit page identifier

- **WHEN** a paired CL Device requests a KN-only page Story
- **THEN** the system rejects the request with a Site Scope mismatch response
- **AND** no KN metrics are returned
