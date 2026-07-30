## ADDED Requirements

### Requirement: Readiness consumes the authoritative Freshness Policy result

Readiness findings SHALL use the same category, state, and sourceTimestamp returned by the Server freshness evaluator. Management and runtime Readiness SHALL NOT use separate freshness windows.

#### Scenario: Policy update changes a threshold

- **WHEN** a trusted manager updates a category threshold
- **THEN** subsequent Readiness and runtime responses use the same new boundary
- **AND** no Client-local threshold remains authoritative
