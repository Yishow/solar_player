## MODIFIED Requirements

### Requirement: Replace Factory Circuit load heuristics with explicit slot binding

The system SHALL let `Factory Circuit` bind both load rows and rendered KPI values to explicit runtime contracts instead of filling missing data with prototype-only heuristics that look like live power.

#### Scenario: Slot is unbound during playback

- **WHEN** a required `Factory Circuit` display slot has no bound circuit or no valid live runtime reading
- **THEN** the page keeps a readable skeleton state for that slot
- **AND** it does not present a fabricated live kW value as though the slot were healthy

##### Example: Missing production binding does not show fake load

- **GIVEN** the `production` slot has no bound circuit
- **WHEN** `Factory Circuit` renders its load rows and KPI summary
- **THEN** the `production` row is marked unbound or degraded
- **AND** any dependent KPI reports degraded provenance instead of silently inheriting prototype power values
