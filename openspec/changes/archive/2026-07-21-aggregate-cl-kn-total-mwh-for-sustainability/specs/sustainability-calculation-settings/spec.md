## MODIFIED Requirements

### Requirement: Carbon reduction is derived uniformly from generation and the carbon emission factor across playback pages

The system SHALL compute carbon reduction from generation and the configured carbon emission factor. Overview and Solar SHALL retain their canonical CL plus KN generation basis. Sustainability SHALL instead use the factory scope resolved from playback settings: CL only, KN only, or the complete CL plus KN aggregate. Today's carbon reduction (tons) SHALL be the applicable scoped generation (kWh) multiplied by the carbon emission factor divided by 1000, and cumulative carbon reduction (tons) SHALL use the applicable scoped cumulative generation by the same formula. Sustainability tree equivalence and any other value derived from cumulative carbon reduction SHALL use that same scope. The system SHALL NOT use the MQTT `todayCo2Reduction`, `totalCo2Reduction`, or `co2` counters as the source for the displayed carbon reduction cards. When the applicable scoped generation value is unavailable or non-finite, the carbon reduction card SHALL keep its existing unavailable/`--` fallback rather than emitting a fabricated value.

#### Scenario: Combined Sustainability scope matches the canonical pages

- **WHEN** the carbon emission factor is configured, complete canonical CL plus KN generation is available, and both factory pages are enabled
- **THEN** the Overview, Solar, and Sustainability today/cumulative carbon reduction cards each derive from the same factor and the corresponding canonical generation
- **AND** the same generation and factor yield the same carbon reduction value on all three pages

##### Example: cumulative carbon reduction from factory totals

- **GIVEN** CL cumulative generation is 9986.306 MWh, KN cumulative generation is 3659.570 MWh, and the carbon emission factor is 0.495 kgCO₂e/kWh
- **WHEN** cumulative carbon reduction is computed
- **THEN** accumulated generation is 13645.876 MWh
- **AND** cumulative carbon reduction is 6754.709 tons after display rounding

#### Scenario: A single factory scope calculates only that factory

- **WHEN** only one factory page is enabled and its current cumulative `total_mwh` is available
- **THEN** Sustainability accumulated generation SHALL equal that factory total only
- **AND** accumulated carbon reduction and tree equivalence SHALL be derived from that same single-factory total

##### Example: separate CL and KN results

- **GIVEN** CL cumulative generation is 9986.306 MWh, KN cumulative generation is 3659.570 MWh, and the carbon emission factor is 0.495 kgCO₂e/kWh
- **WHEN** only CL is enabled
- **THEN** Sustainability accumulated generation is 9986.306 MWh and cumulative carbon reduction is 4943.221 tons after display rounding
- **WHEN** only KN is enabled
- **THEN** Sustainability accumulated generation is 3659.570 MWh and cumulative carbon reduction is 1811.487 tons after display rounding

#### Scenario: Missing generation keeps the fallback

- **WHEN** a generation dependency required by the current Sustainability scope is unavailable, stale, non-finite, or rejected as a cumulative regression
- **THEN** the card keeps the last valid value for that same scope with stale provenance or its existing unavailable/`--` fallback
- **AND** no partial or fabricated carbon reduction value is shown
- **AND** a factory outside the current single-factory scope SHALL NOT make the selected factory unavailable
