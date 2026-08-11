## Purpose

提供可解釋且有界的資料健康規則，將 stale、缺值、累積值重設、異常跳變與適用資料的卡值狀態轉成可去重、可恢復的事件，讓 operator 能判斷目前數字是否可信而不依賴黑箱模型。

## ADDED Requirements

### Requirement: Data health rules produce explainable findings from authoritative runtime state

The system SHALL evaluate data-health rules from authoritative metric values, source timestamps, freshness policy, active-source provenance, and explicit rule configuration. Each finding SHALL identify the rule and bounded reason that produced it.

#### Scenario: Required metric becomes stale

- **WHEN** an authoritative metric exceeds its configured freshness threshold
- **THEN** the health engine SHALL open or update a stale-data event for that metric/source
- **AND** the event SHALL include the source timestamp and applicable rule category without exposing raw credentials or payload secrets

#### Scenario: Cumulative metric resets

- **WHEN** a cumulative counter decreases or its persisted reset count advances
- **THEN** the system SHALL create one reset event for that reset edge
- **AND** subsequent readings from the new baseline SHALL NOT create duplicate reset events for the same edge

### Requirement: Repeated health observations are deduplicated into an event lifecycle

The system SHALL represent a continuous occurrence of the same health problem as one event that progresses through open/ongoing/recovered states.

#### Scenario: Same stale condition persists across polls

- **WHEN** the same metric remains stale across repeated evaluations
- **THEN** the existing open event SHALL update its last-observed time
- **AND** the system SHALL NOT create one new alert row per poll

#### Scenario: Health condition recovers and later recurs

- **WHEN** an open health condition becomes healthy
- **THEN** its event SHALL be marked recovered
- **AND** a later new occurrence SHALL create a new event rather than reopening history ambiguously

### Requirement: Stuck-value detection avoids known valid steady-state windows

Stuck-value detection SHALL only run for metric/rule profiles where unchanged values are meaningful anomalies and SHALL support expected steady-state suppression such as nighttime solar zero.

#### Scenario: Solar generation remains zero during an expected nighttime window

- **WHEN** a solar generation metric is zero during a configured expected-zero window
- **THEN** the default health rules SHALL NOT open a stuck-value alert solely because the value is unchanged
