## Purpose

提供可管理的能源營運目標，讓發電量、自用率與用電上限能以 canonical units 和明確比較方向被設定、版本化並和同一份能源 report actual 對照，避免把缺資料或不同期間混成誤導性的達成率。

## ADDED Requirements

### Requirement: Operators can configure bounded energy goals

Trusted operators SHALL be able to configure enabled goals with a metric, period, canonical target value, comparison direction, and effective range. The initial management surface SHALL support monthly generation target, self-consumption-ratio target, and consumption ceiling.

#### Scenario: Operator configures a monthly generation target

- **WHEN** a trusted operator saves a positive monthly generation target
- **THEN** the goal SHALL be persisted in the canonical energy unit and become effective for the configured period

### Requirement: Goal status derives from report actual and coverage

Goal progress and gap SHALL use the canonical report actual for the same period and SHALL become unavailable rather than fabricated when report coverage is insufficient.

#### Scenario: Consumption remains below its ceiling

- **WHEN** a consumption-ceiling goal has sufficient current-period actual data
- **THEN** the system SHALL evaluate success direction as actual less than or equal to target
- **AND** it SHALL expose the remaining margin in the canonical unit

#### Scenario: Report coverage is insufficient

- **WHEN** the report cannot provide a trustworthy actual for a configured goal
- **THEN** the goal status SHALL be `unavailable` or an equivalent explicit state
- **AND** the system SHALL NOT display a fabricated zero-percent or hundred-percent achievement
