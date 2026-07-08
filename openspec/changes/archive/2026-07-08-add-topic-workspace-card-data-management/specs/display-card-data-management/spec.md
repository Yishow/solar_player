## ADDED Requirements

### Requirement: Present card-centric data diagnostics in the MQTT Topic workspace

The system SHALL present card-centric data diagnostics in the `Card Data Management` tab of the MQTT Topic workspace.

#### Scenario: Operator reviews cards that depend on runtime data

- **WHEN** the operator opens the `Card Data Management` tab
- **THEN** the system SHALL list value-bearing playback cards with page identity, card identity, metric identity, current displayed value, unit, source classification, source topics, required inputs, formula or aggregate description, and last update
- **AND** the operator SHALL NOT need to infer missing card data only from playback tooltips or topic rows

##### Example: Solar self-consumption ratio identifies both required inputs

- **GIVEN** the self-consumption ratio uses `selfConsumptionEnergy` and `consumptionEnergy`
- **WHEN** the operator reviews that card in `Card Data Management`
- **THEN** the row lists both required inputs and the topic mapping status for each mapped input

#### Scenario: Diagnostics classify unavailable values

- **WHEN** a card has no displayable numeric value
- **THEN** the system SHALL classify the unavailable state as `missing-topic`, `idle-topic`, `waiting-aggregate`, `formula-input-missing`, or `manual-only`
- **AND** the system SHALL expose the next available action for that classification

##### Example: Sustainability household card waits for aggregate input

- **GIVEN** the daily household card depends on daily self-consumption summary data
- **AND** the summary has not been produced for the current day
- **WHEN** the operator reviews that card in `Card Data Management`
- **THEN** the row status is `waiting-aggregate`
- **AND** the row names the upstream self-consumption metric that feeds the aggregate

### Requirement: Provide data completion actions from card diagnostics

The system SHALL provide data completion actions from each card diagnostic row according to the row source classification.

#### Scenario: Card depends on an editable MQTT metric

- **WHEN** a card diagnostic row depends on a metric that has an MQTT topic mapping
- **THEN** the system SHALL provide an action to publish a numeric test value to that mapped topic
- **AND** the action SHALL use the existing MQTT topic publish path for the metric mapping

##### Example: Today generation publishes through its mapped topic

- **GIVEN** `todayGeneration` maps to `kuozui/plant/solar/today_energy`
- **WHEN** the operator publishes `168` from the today generation card diagnostic row
- **THEN** the system publishes payload `168` to `kuozui/plant/solar/today_energy`

#### Scenario: Card depends on a missing MQTT mapping

- **WHEN** a card diagnostic row depends on a metric that has no topic mapping
- **THEN** the system SHALL provide an action that takes the operator to the `Topic mapping` tab and identifies the missing metric key
- **AND** the card diagnostic row SHALL remain visible when the operator returns to `Card Data Management`

#### Scenario: Card depends on calculation settings

- **WHEN** a card diagnostic row depends on calculation profile values
- **THEN** the system SHALL identify the relevant calculation setting names
- **AND** the system SHALL provide a management action to edit or navigate to those calculation settings when that management surface exists

##### Example: Household card names calculation profile fields

- **GIVEN** the cumulative household card depends on `householdMonthlyUsageKwh`
- **WHEN** the operator opens that diagnostic row
- **THEN** the row lists `householdMonthlyUsageKwh` as a required calculation setting

### Requirement: Persist display-only card value overrides separately from true data

The system SHALL persist display-only card value overrides separately from MQTT messages, live metric values, daily summaries, and cumulative counters.

#### Scenario: Operator applies a display override

- **WHEN** the operator applies an override for a supported card target
- **THEN** playback story payloads SHALL use the override display value for that target
- **AND** diagnostics SHALL preserve the original source value and mark the target as `overridden`
- **AND** the system SHALL NOT write the override value into raw MQTT ingestion, live metric storage, daily summaries, or cumulative counters

##### Example: Override changes a card without changing its source metric

- **GIVEN** `todayGeneration` source value is `120.5 kWh`
- **WHEN** the operator applies an override value of `168 kWh` for the corresponding display card
- **THEN** playback receives `168 kWh` for that card display target
- **AND** diagnostics still report the original source value as `120.5 kWh`

#### Scenario: Operator clears a display override

- **WHEN** the operator clears an active override for a supported card target
- **THEN** playback story payloads SHALL return to the real source or computed value
- **AND** the override record SHALL no longer be applied to the display payload

##### Example: Cleared override restores today generation source value

- **GIVEN** `todayGeneration` source value is `120.5 kWh`
- **AND** an active override displays `168 kWh`
- **WHEN** the operator clears the override
- **THEN** playback receives `120.5 kWh` for that card display target

#### Scenario: Override input is invalid

- **WHEN** the operator submits an override with a non-numeric value for a numeric target
- **THEN** the system SHALL reject the override with a validation error
- **AND** the existing display value SHALL remain unchanged

##### Example: Text override is rejected for a numeric target

- **GIVEN** the target card accepts numeric kWh values
- **WHEN** the operator submits `good looking`
- **THEN** the system returns a validation error
- **AND** the active display value remains unchanged
