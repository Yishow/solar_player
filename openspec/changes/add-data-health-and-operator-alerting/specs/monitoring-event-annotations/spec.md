## Purpose

把 MQTT 斷線與恢復、裝置重啟、資料 reset、健康異常等 server-authoritative 事件對齊到能源趨勢與歷史資料的時間軸，讓使用者能直接解釋曲線突變，而不是跨頁人工比對時間。

## ADDED Requirements

### Requirement: Monitoring history can return bounded event annotations for the requested time range

The system SHALL expose monitoring event annotations aligned to server-authoritative timestamps and SHALL filter them to the requested history/trend range.

#### Scenario: MQTT disconnect occurs inside a viewed range

- **WHEN** the requested energy-history range includes an MQTT disconnect and later recovery event
- **THEN** the response SHALL include bounded annotations for those events with their timestamps and event types
- **AND** events outside the requested range SHALL NOT be returned solely for that chart

### Requirement: Energy trend surfaces render event annotations without obscuring metric data

Energy Trend and Energy History SHALL render relevant event markers that can be inspected for a short explanation while preserving the underlying chart values.

#### Scenario: Counter reset coincides with a visible trend discontinuity

- **WHEN** a counter-reset event falls within the displayed time range
- **THEN** the chart SHALL mark the reset time
- **AND** the operator SHALL be able to inspect the reset annotation without navigating away from the chart
