## ADDED Requirements

### Requirement: Overview and Solar keep static subtree output stable during value-only refresh

The system SHALL keep static layout, hero media, ornament, connector, and card-shell output stable on Overview and Solar when only live values, story copy, or weather data refresh.

#### Scenario: Overview updates runtime values without rebuilding static layout

- **WHEN** Overview receives new live metrics, story payload, or weather data while its config and media sources stay unchanged
- **THEN** the page updates only the value-bearing subtree
- **AND** the static layout, hero media, and KPI shell output remain equivalent to the pre-refresh render

#### Scenario: Solar updates story values without rebuilding connectors

- **WHEN** Solar receives new live values or story payload while its config and icon sources stay unchanged
- **THEN** the page updates only the value-bearing subtree
- **AND** the connector and flow-node geometry remain equivalent to the pre-refresh render
