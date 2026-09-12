## ADDED Requirements

### Requirement: Trend axes and curves share the same numeric domain

EnergyTrend SHALL calculate chart coordinates and labelled Y-axis ticks from the same domain and the metric's existing unit. The domain SHALL include zero and all finite displayed values; percentage metrics SHALL cover at least zero through one hundred percent. Missing values SHALL preserve the existing empty/degraded behavior and SHALL NOT be converted into measured zero. Source selection and aggregates SHALL remain unchanged.

#### Scenario: Power and energy axes use their units

- **WHEN** a kW, kWh, or t trend card renders
- **THEN** its Y-axis SHALL display numeric ticks with the corresponding unit
- **AND** each plotted value SHALL occupy the position represented by those ticks
- **AND** the axis SHALL NOT display a generic percentage scale

##### Example: Energy uses the shared linear scale

- **GIVEN** a kWh series contains values 0, 1200, and 2400 and its calculated domain is 0 through 2400
- **WHEN** axis labels and curve coordinates render
- **THEN** 1200 SHALL appear halfway between the zero and 2400 kWh positions

#### Scenario: A percentage below one hundred is not stretched to one hundred

- **GIVEN** a percentage series contains fixture values 20 and 40
- **WHEN** the chart renders with no value outside the percentage range
- **THEN** its domain SHALL be 0 through 100
- **AND** the value 40 SHALL occupy forty percent of the plot height above zero
- **AND** existing values above 100 SHALL expand the domain rather than being silently clipped

#### Scenario: Zero and missing data remain distinct

- **WHEN** a series contains only measured zeros
- **THEN** it SHALL render a zero line using a nonzero calculation span and the correct unit
- **WHEN** all values are missing
- **THEN** it SHALL render the existing empty state without manufacturing data points
