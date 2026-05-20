## MODIFIED Requirements

### Requirement: Maintain a first-class rotation plan for display pages

The system SHALL evaluate the stored rotation plan through a unified page-eligibility contract that can skip or fault pages based on readiness, freshness, publish state, asset health, and fallback policy.

#### Scenario: Page stays configured but becomes ineligible

- **WHEN** a page remains in the configured rotation plan but later becomes ineligible due to blocking readiness or stale runtime data
- **THEN** the effective runtime rotation skips or faults that page according to policy
- **AND** operators can see the reason without losing the underlying configured plan

##### Example: Configured Overview page is skipped for stale runtime

- **GIVEN** `overview` remains enabled in the stored rotation plan
- **WHEN** its live-dependent runtime freshness exceeds the allowed window
- **THEN** the configured plan still lists `overview`
- **AND** the effective runtime rotation reports `overview` as skipped or faulted with the stale-runtime reason
