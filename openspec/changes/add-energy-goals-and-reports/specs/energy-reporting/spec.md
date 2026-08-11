## Purpose

提供以 server-authoritative local period 與既有 daily summaries 為核心的日、週、月能源報告，包含資料覆蓋率、來源時間、同進度比較與 CSV 輸出，讓管理者能直接使用而不把缺資料或未完成月份誤解成完整 actual。

## ADDED Requirements

### Requirement: Energy reports support daily, weekly, and monthly local periods

The system SHALL produce daily, weekly, and monthly energy reports using server-authoritative local period boundaries and SHALL expose generation, consumption, self-consumption, CO2, applicable peaks, and data coverage/provenance when available.

#### Scenario: Operator opens the current monthly report

- **WHEN** the current local month is not complete
- **THEN** the report SHALL be marked partial and identify its actual covered date/time range
- **AND** it SHALL NOT imply that missing future days contain zero energy

### Requirement: Primary period comparison uses a comparable elapsed window

For an incomplete current week or month, the primary previous-period comparison SHALL use the equivalent elapsed portion of the previous period when sufficient data exists.

#### Scenario: Monthly report is viewed on day 11

- **WHEN** the current monthly report covers only the first 11 local days
- **THEN** the primary previous-month comparison SHALL use the comparable first-11-day window rather than the previous complete month
- **AND** any complete-period comparison SHALL be separately labelled

### Requirement: Missing source coverage is explicit

The system SHALL expose expected versus observed coverage and SHALL not convert missing history into measured zero values.

#### Scenario: Several daily summaries are absent

- **WHEN** a weekly or monthly range lacks one or more expected daily summaries
- **THEN** the report SHALL mark coverage as partial or insufficient
- **AND** comparisons that cannot be made honestly SHALL be unavailable with a reason

### Requirement: CSV export uses the same report model as the management view

The system SHALL export CSV from the canonical report result rather than independently recalculating energy totals.

#### Scenario: Operator downloads a monthly CSV

- **WHEN** a report is successfully exported
- **THEN** its totals, period boundaries, coverage, and canonical units SHALL match the report shown for the same report revision
