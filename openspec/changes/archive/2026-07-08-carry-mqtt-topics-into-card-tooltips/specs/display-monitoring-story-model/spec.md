## MODIFIED Requirements

### Requirement: Expose monitoring card source composition in playback tooltips

The system SHALL expose source composition for playback monitoring cards so operators can inspect the metric keys, MQTT topics, and dependencies behind displayed card values.

#### Scenario: Operator inspects a direct MQTT metric card

- **WHEN** an operator hovers or focuses a monitoring card whose value comes from a direct metric mapping
- **THEN** the card tooltip SHALL identify the displayed metric key
- **AND** the tooltip SHALL identify the configured MQTT topic when one exists
- **AND** the tooltip SHALL identify the displayed unit when one exists

#### Scenario: Operator inspects a derived metric card

- **WHEN** an operator hovers or focuses the Solar self-consumption ratio card
- **THEN** the card tooltip SHALL identify `selfConsumptionRatio` as the displayed metric
- **AND** the tooltip SHALL identify `selfConsumptionEnergy` and `consumptionEnergy` as dependency keys for fallback derivation
- **AND** the tooltip SHALL identify configured MQTT topics for `selfConsumptionEnergy` and `consumptionEnergy` when those dependency mappings exist
- **AND** the tooltip SHALL preserve the visible card label `自發自用比例`

#### Scenario: Operator inspects an aggregate or partially mapped card

- **WHEN** a monitoring card has dependency metadata but no direct MQTT topic
- **THEN** the tooltip SHALL show the available source class and dependency keys
- **AND** the tooltip SHALL use a clear empty marker for missing direct topic instead of hiding the source line

#### Scenario: Tooltip does not change playback layout

- **WHEN** source composition tooltip metadata is added to monitoring cards
- **THEN** the card frame size, value row, icon, and visible card copy SHALL remain layout-stable
- **AND** the tooltip SHALL NOT require new page-local hardcoded copy for each card
