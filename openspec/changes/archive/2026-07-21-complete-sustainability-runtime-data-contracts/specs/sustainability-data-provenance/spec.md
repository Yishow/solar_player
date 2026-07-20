## MODIFIED Requirements

### Requirement: Keep data provenance as first-class presentation data in Sustainability

The system SHALL keep provenance as first-class data for every rendered Sustainability indicator, including numeric aggregates and editorial modules.

#### Scenario: Sustainability card falls back to degraded data

- **WHEN** a Sustainability number or module is rendered from degraded, stale, or manually curated data
- **THEN** the page can identify that provenance class to operators and diagnostics
- **AND** the value is not indistinguishable from a fully healthy runtime aggregate

##### Example: Annual energy-saving card is manual or stale

- **GIVEN** the annual energy-saving value is currently provided by a degraded rollup or manual fallback
- **WHEN** the `Sustainability` page renders that card
- **THEN** the provenance block shows that degraded source class
- **AND** readiness can reflect the same dependency gap
