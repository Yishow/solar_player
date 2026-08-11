## Purpose

定義執行中 mock 與 MQTT 資料來源的互斥 lifecycle、切換、失敗復原與 restart reconciliation，確保管理設定與真正寫入正式即時資料的 producer 狀態一致且可觀測。

## ADDED Requirements

### Requirement: Runtime metric producers are mutually exclusive

The system SHALL allow at most one active production metric producer to write the canonical live metric store at any time: either the mock producer or the MQTT producer.

#### Scenario: Mock runtime switches successfully to MQTT

- **WHEN** the active source is mock and an operator requests MQTT activation with a usable broker configuration
- **THEN** the system SHALL prepare the MQTT target before completing the handoff
- **AND** it SHALL stop mock writes before MQTT becomes the active production writer
- **AND** no subsequent mock timer tick SHALL overwrite canonical MQTT values while MQTT remains active

#### Scenario: MQTT runtime switches to mock

- **WHEN** the active source is MQTT and an operator activates mock mode
- **THEN** the system SHALL disable MQTT reconnect, close the active MQTT client, and release its runtime lease before starting the mock producer
- **AND** mock readings SHALL begin without requiring a server restart

### Requirement: Source activation failure preserves a truthful active source

The system SHALL distinguish desired source configuration from the source that is actually active and SHALL preserve a usable existing source when target activation fails.

#### Scenario: MQTT preflight fails while mock is active

- **WHEN** MQTT settings are saved but the target broker cannot pass the activation preflight
- **THEN** the saved desired configuration SHALL remain available for later retry
- **AND** the active source SHALL remain mock
- **AND** runtime status SHALL report the failed transition instead of reporting MQTT as active

### Requirement: MQTT lease ownership ends only after the client can no longer reconnect

The system SHALL prevent an MQTT client from relinquishing its runtime lease while that same client can still reconnect or emit active-runtime state changes.

#### Scenario: Initial MQTT connection fails

- **WHEN** an MQTT candidate fails its bounded initial connection attempt
- **THEN** the candidate SHALL be prevented from reconnecting and fully closed before any formal runtime lease is released
- **AND** later events from that candidate SHALL NOT change active MQTT status

### Requirement: Restart reconciles persisted desired and active source state

The system SHALL restore a truthful active producer at server startup and SHALL NOT infer active source solely from a desired configuration that previously failed activation.

#### Scenario: Server restarts after a failed MQTT activation

- **WHEN** desired mode is MQTT but the last persisted active source remains mock because MQTT activation failed
- **THEN** startup SHALL restore the mock producer as the active source first
- **AND** any MQTT retry SHALL use the same safe transition rules as an operator-initiated switch
