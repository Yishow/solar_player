## MODIFIED Requirements

### Requirement: Overview and Solar keep static subtree output stable during value-only refresh

The system SHALL keep static layout, hero media, ornament, connector, and card-shell output stable on Overview and Solar when only live values, story copy, or weather data refresh. Each page SHALL scope live metric subscriptions to the value-bearing subtree that actually reads those inputs, so unrelated metric updates SHALL NOT rebuild unaffected static or value subtrees.

#### Scenario: Overview updates runtime values without rebuilding static layout

- **WHEN** Overview receives new live metrics, story payload, or weather data while its config and media sources stay unchanged
- **THEN** the page updates only the value-bearing subtree that depends on the changed runtime inputs
- **AND** the static layout, hero media, and KPI shell output remain equivalent to the pre-refresh render

#### Scenario: Overview ignores unrelated metric updates

- **WHEN** Overview receives a `liveMetrics:update` snapshot whose changed fields are not read by the visible Overview runtime subtree
- **THEN** the page keeps the visible output equivalent to the pre-update render
- **AND** it does not rebuild the static layout or unrelated value subtree solely because the shared snapshot object changed

##### Example: unrelated metric update on Overview

| Changed metric | Visible Overview binding depends on it? | Expected visible result |
| -------------- | --------------------------------------- | ----------------------- |
| `phaseRVoltage` | yes | update the affected phase-power subtree |
| `factoryCircuitHeavyVehiclePower` | no | no visible Overview output change |

#### Scenario: Solar updates story values without rebuilding connectors

- **WHEN** Solar receives new live values or story payload while its config and icon sources stay unchanged
- **THEN** the page updates only the value-bearing subtree that depends on the changed runtime inputs
- **AND** the connector, flow-node geometry, and hero shell remain equivalent to the pre-refresh render
