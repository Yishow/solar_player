## MODIFIED Requirements

### Requirement: Factory Circuit metric keys are page-scoped

The system SHALL resolve Factory Circuit slot data by the combination of Context Site Scope and a site-independent semantic slot metric key. The Factory Circuit page key SHALL select the page instance/layout and allowed slot set, but CL and KN MAY use the same semantic metric key for the same engineering measurement because the scoped metric identity prevents collisions.

#### Scenario: Same engineering slot exists in multiple sites
- **WHEN** Jungli and Guanyin both bind a `stamping` slot
- **THEN** both slots MAY use the same canonical semantic stamping power metric key
- **AND** the Jungli reading SHALL resolve under `metricScope = cl`
- **AND** the Guanyin reading SHALL resolve under `metricScope = kn`
- **AND** MQTT live values for the two scoped identities SHALL NOT overwrite each other

#### Scenario: Site page identity remains distinct
- **WHEN** playback resolves `factory-circuit` for CL and `factory-circuit-guanyin` for KN
- **THEN** each page keeps its existing page identity, layout, visible-slot rules, and route
- **AND** page identity SHALL NOT be required as part of the semantic metric key
