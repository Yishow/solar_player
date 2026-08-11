## Purpose

提供管理者單一告警入口，把資料健康、MQTT、裝置與其他可操作事件整理為 active/recent alerts，支援確認、暫時靜音與來源導覽，同時保留未設定外部通知服務時的真實狀態。

## ADDED Requirements

### Requirement: Alert Center presents active and recent operator-relevant events

The management surface SHALL provide one Alert Center that lists active and recent operator-relevant events with severity, domain, opened/recovered time, bounded summary, and a link to the relevant diagnostic or management surface.

#### Scenario: Multiple domains have active problems

- **WHEN** MQTT connectivity and one metric freshness rule are both unhealthy
- **THEN** the Alert Center SHALL show both active alerts without requiring the operator to visit each source page first
- **AND** each alert SHALL retain its own source/domain context

### Requirement: Acknowledgement and mute do not alter system truth

Operators SHALL be able to acknowledge an alert or mute its presentation/delivery for a bounded period without changing the underlying health/readiness state.

#### Scenario: Operator acknowledges an active alert

- **WHEN** an operator acknowledges an active alert
- **THEN** the acknowledgement SHALL be recorded separately from the event health state
- **AND** the alert SHALL remain active until its source condition actually recovers

### Requirement: External delivery state is explicit when no provider is configured

The alert system SHALL expose a channel adapter boundary and SHALL NOT claim successful Email, LINE, or other external delivery when no corresponding provider is configured.

#### Scenario: Operator enables an unavailable external channel

- **WHEN** a requested external alert channel has no installed/configured provider
- **THEN** the management surface SHALL report that channel as unavailable
- **AND** in-app alerting SHALL continue to work independently
