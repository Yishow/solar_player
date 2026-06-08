## ADDED Requirements

### Requirement: Define three-phase power metric keys

The system SHALL define nine first-class metric keys for three-phase power readings: `phaseRVoltage`, `phaseRCurrent`, `phaseRPower`, `phaseSVoltage`, `phaseSCurrent`, `phaseSPower`, `phaseTVoltage`, `phaseTCurrent`, and `phaseTPower`. Each key SHALL resolve to a non-empty human-readable metric label so it can be presented as a manageable tag.

#### Scenario: Three-phase keys are first-class metrics

- **WHEN** the system enumerates available metric keys
- **THEN** the nine three-phase power keys are present and each resolves to a non-empty label

##### Example: phase R voltage label

- **GIVEN** the metric key `phaseRVoltage`
- **WHEN** its label is resolved
- **THEN** the label is non-empty and identifies the R-phase voltage reading

### Requirement: Manage three-phase tags on the MQTT settings surface

The MQTT settings surface SHALL allow an operator to create, link, enable, and disable a topic mapping (tag) for each three-phase power metric key, using the same topic-mapping shape and workflow as existing metrics. The mapping `metricKey` SHALL equal the exact three-phase key string so ingestion persists the value under that key.

#### Scenario: Operator creates a three-phase tag

- **WHEN** an operator creates a topic mapping with `metricKey` set to a three-phase key, a broker topic, and an enabled flag
- **THEN** the mapping is persisted and listed alongside existing metric mappings

#### Scenario: Disabled three-phase tag is not ingested

- **WHEN** a three-phase topic mapping is disabled
- **THEN** incoming messages for its topic SHALL NOT update the corresponding live metric value

### Requirement: Surface three-phase readings to the Overview phase power widget

When live three-phase metric values are present in the snapshot, the Overview three-phase power widget SHALL render the corresponding R/S/T voltage, current, and power values. When a reading is absent, the widget SHALL render the `--` placeholder for that field without rendering `NaN` or `undefined`, and SHALL NOT render mock values.

#### Scenario: Populated three-phase readings render real values

- **WHEN** the live snapshot contains voltage, current, and power readings for phases R, S, and T
- **THEN** the three-phase power widget renders those values in their R/S/T rows

##### Example: R-phase row values

- **GIVEN** snapshot readings `phaseRVoltage=220.5`, `phaseRCurrent=12.3`, `phaseRPower=2.70`
- **WHEN** the widget renders the R row
- **THEN** it shows voltage `220.5`, current `12.3`, and power `2.70`

#### Scenario: Missing readings fall back without mock content

- **WHEN** no three-phase readings are present in the snapshot
- **THEN** every three-phase field renders `--`, and no mock value (such as a fixed demo number) appears

### Requirement: Bind the generation trend widget to runtime trend data

The Overview generation trend widget SHALL render from the runtime-provided `realTimePower` trend series exposed by the view model. When no runtime trend data is available, the widget SHALL render its empty state rather than mock content.

#### Scenario: Runtime trend renders the area sparkline

- **WHEN** the view model exposes a non-empty `realTimePower` trend series
- **THEN** the generation trend widget renders the area sparkline from that series

#### Scenario: Absent trend renders the empty state

- **WHEN** the view model exposes no `realTimePower` trend series
- **THEN** the generation trend widget renders its empty state and no sparkline
