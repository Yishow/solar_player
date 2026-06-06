## ADDED Requirements

### Requirement: Connector treatments SHALL include editable stroke color

The system SHALL include strokeColor in FlowConnectorTreatmentConfig as a CSS color string with a default value of #4ade80. Supported connector treatment inspectors SHALL expose strokeColor beside stroke width and opacity controls.

#### Scenario: Missing stroke color uses the shared default

- **WHEN** a connector treatment config omits strokeColor
- **THEN** the resolved connector treatment SHALL use #4ade80
- **AND** existing strokeWidth, opacity, radius, and lineCap defaults SHALL remain unchanged

#### Scenario: Inspector exposes stroke color for connector treatment regions

- **WHEN** an operator selects a supported connector treatment region in the display editor
- **THEN** the inspector SHALL expose a strokeColor field
- **AND** editing that field SHALL update the same connector treatment config object used by runtime preview and published playback

##### Example: Stroke color schema field

| Field | Type | Default | Boundary |
| ----- | ----- | ----- | ----- |
| strokeColor | string | #4ade80 | CSS color string, non-empty after fallback |
