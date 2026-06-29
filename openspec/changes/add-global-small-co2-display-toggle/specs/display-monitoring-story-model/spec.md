## ADDED Requirements

### Requirement: Shared monitoring story can apply a display-only sub-ton CO2 unit preference

The system SHALL allow the shared monitoring story output for CO2 metrics to apply a display-only unit preference without changing the underlying carbon reduction calculation basis. When the global CO2 display preference is enabled and a CO2 metric's computed base unit is `t`, any non-zero value whose absolute magnitude is less than 1 SHALL be rendered for display as `kg` using `t * 1000`. Values equal to 0 SHALL remain displayed as `t`, values whose absolute magnitude is 1 or greater SHALL remain displayed as `t`, and unavailable values SHALL keep their existing fallback display.

#### Scenario: Enabled preference converts sub-ton CO2 displays to kilograms

- **WHEN** the global CO2 display preference is enabled
- **AND** a shared monitoring story CO2 metric resolves to a non-zero value smaller than 1 ton in magnitude
- **THEN** the story display output renders that metric in kilograms
- **AND** the converted value equals the ton value multiplied by 1000

##### Example: Overview and Solar share the same converted display

| Base tons | Preference | Display value | Display unit |
| --------- | ---------- | ------------- | ------------ |
| 0.011781  | true       | 11.8          | kg           |
| 0.495     | true       | 495           | kg           |

#### Scenario: Disabled preference keeps ton display

- **WHEN** the global CO2 display preference is disabled
- **AND** a shared monitoring story CO2 metric resolves to a value smaller than 1 ton in magnitude
- **THEN** the story display output keeps the metric displayed in tons

##### Example: Disabled preference preserves ton output

| Base tons | Preference | Display value | Display unit |
| --------- | ---------- | ------------- | ------------ |
| 0.011781  | false      | 0.01          | t            |
| 0.495     | false      | 0.5           | t            |

#### Scenario: Zero, fallback, and full-ton values do not switch units

- **WHEN** the global CO2 display preference is enabled
- **THEN** zero-ton values stay displayed in tons, unavailable values keep their existing fallback display, and values whose absolute magnitude is 1 ton or greater stay displayed in tons

##### Example: Non-converted cases

| Base value | Base unit | Preference | Display value | Display unit |
| ---------- | --------- | ---------- | ------------- | ------------ |
| 0          | t         | true       | 0             | t            |
| 1          | t         | true       | 1             | t            |
| --         | t         | true       | --            | t            |
