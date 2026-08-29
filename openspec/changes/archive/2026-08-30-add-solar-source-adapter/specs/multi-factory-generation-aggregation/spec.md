## ADDED Requirements

### Requirement: Multi-factory aggregation consumes adapter-managed factory source metrics

The multi-factory generation aggregate SHALL use the Solar adapter's scoped `factoryGeneration.todayMwh`, `factoryGeneration.monthMwh`, and `factoryGeneration.totalMwh` readings as its CL and KN upstream inputs. Generic direct mappings and scalar compatibility topics MUST NOT compete as alternate inputs to the canonical aggregate.

#### Scenario: Both adapter-managed site summaries are current
- **WHEN** the CL and KN adapter source metrics are finite, current, and sourced from valid factory summaries
- **THEN** the existing complete-both-sites aggregation rules evaluate those scoped inputs
- **AND** the global canonical generation is updated using the older of the two source timestamps as already required

#### Scenario: Legacy generic factory-generation mapping is still present
- **WHEN** a legacy or custom mapping attempts to write an adapter-owned CL or KN factory-generation source identity
- **THEN** that mapping cannot become an enabled competing source
- **AND** aggregate evaluation continues to use the adapter-managed scoped reading

### Requirement: Aggregate units remain MWh at the factory-source boundary

The Solar adapter and multi-factory aggregation boundary SHALL preserve `today_mwh`, `month_mwh`, and `total_mwh` as `MWh` values. Player-facing conversions such as displaying daily generation in `kWh` SHALL occur downstream and MUST NOT alter or relabel the adapter source values.

#### Scenario: CL summary reports 3.49 MWh today
- **WHEN** the adapter projects the CL summary for aggregation
- **THEN** `cl/factoryGeneration.todayMwh` has value `3.49` and unit `MWh`
- **AND** downstream presentation MAY derive `3490 kWh` without rewriting the source metric as if it had arrived in kWh
