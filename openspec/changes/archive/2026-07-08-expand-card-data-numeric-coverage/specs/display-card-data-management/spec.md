## MODIFIED Requirements

### Requirement: Present card-centric data diagnostics in the MQTT Topic workspace

The system SHALL present card-centric data diagnostics in the `Card Data Management` tab of the MQTT Topic workspace for requested numeric playback cards.

#### Scenario: Operator reviews cards that depend on runtime data

- **WHEN** the operator opens the `Card Data Management` tab
- **THEN** the system SHALL list value-bearing playback cards with page identity, card identity, metric identity, current displayed value, unit, source classification, source topics, required inputs, formula or aggregate description, and last update
- **AND** the operator SHALL NOT need to infer missing card data only from playback tooltips or topic rows

##### Example: Solar self-consumption ratio identifies both required inputs

- **GIVEN** the self-consumption ratio uses `selfConsumptionEnergy` and `consumptionEnergy`
- **WHEN** the operator reviews that card in `Card Data Management`
- **THEN** the row lists both required inputs and the topic mapping status for each mapped input

#### Scenario: Sustainability numeric cards are listed

- **WHEN** the operator opens the `Card Data Management` tab
- **THEN** the system SHALL list Sustainability numeric display cards such as accumulated generation, accumulated carbon reduction, annual energy-saving percent, planted tree equivalent, and household-equivalent cards
- **AND** each listed row SHALL expose source provenance, display value, original value, and display-only override action

#### Scenario: Factory Circuit engineering slot power values are listed

- **WHEN** the operator opens the `Card Data Management` tab
- **THEN** the system SHALL list Factory Circuit engineering slot power values for configured display slots
- **AND** each slot row SHALL expose the engineering label, slot metric key, source topic state, latest live value, and display-only override action

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

##### Example: Factory slot publishes through its mapped topic

- **GIVEN** `factoryStampingPower` maps to `kuozui/factory/stamping/power`
- **WHEN** the operator publishes `168` from the stamping slot diagnostic row
- **THEN** the system publishes payload `168` to `kuozui/factory/stamping/power`

## ADDED Requirements

### Requirement: Keep Card Data Management input labels readable

The system SHALL render Card Data Management numeric input labels horizontally.

#### Scenario: Operator reviews override and publish inputs

- **WHEN** a row shows publish or display override controls
- **THEN** labels such as `測試數值` and `展示覆寫值` SHALL remain horizontal
- **AND** the fix SHALL NOT change the surrounding Topic workspace card layout
