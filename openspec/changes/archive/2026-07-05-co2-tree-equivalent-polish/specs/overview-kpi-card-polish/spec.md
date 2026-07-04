## MODIFIED Requirements

### Requirement: KPI card default styles and CO2 indicator animation
The default shape of the Overview KPI card icon chips SHALL be rounded-square. The CO2 tree equivalent indicator dot SHALL render a pulsing breathing animation. The CO2 tree equivalent calculation factor SHALL be 6.25 (based on 1 tree absorbing 160kg of CO2 over 20 years, where CO2 reduction is measured in tonnes). The tree equivalent footer text SHALL display in the format "約種植 ? 棵樹（1棵樹20年，平均吸收160kg co2）".

#### Scenario: Rounded-square icon and pulsing dot
- **WHEN** `/overview` renders the KPI cards
- **THEN** the icon chips render as rounded-squares by default
- **AND** the CO2 tree equivalent indicator dot pulses visually via a CSS keyframe animation
- **AND** the CO2 tree equivalent calculation maps 12.4 tonnes of CO2 to 78 trees
- **AND** the tree equivalent text renders as "約種植 78 棵樹（1棵樹20年，平均吸收160kg co2）"

##### Example: CO2 tree equivalent calculation mapping
- **GIVEN** the CO2 reduction value is 12.4 tonnes
- **WHEN** the KPI footer is rendered
- **THEN** the tree equivalent value is calculated as 78 trees (12.4 * 6.25 = 77.5 rounded to 78)
- **AND** the text matches "約種植 78 棵樹（1棵樹20年，平均吸收160kg co2）"
