## Why

目前系統只保留 `live_metric_values` 的最新值，以及彙整過的 `metric_snapshots` / `daily_energy_summaries`。這足夠驅動 playback 與監看頁，但不足以回答「某個 topic 在某一段時間到底收到過什麼 payload」的營運追查需求，也無法支援日後更精細的重播、回放或異常比對。

## What Changes

- 提出一個獨立 capability，將原始 MQTT topic / payload / received_at 歷史持久化到本機 SQLite。
- 定義 retention、查詢入口、敏感資料遮蔽與與現有 latest-value / snapshot pipeline 的邊界。
- 明確限制這個 change 不直接重寫 Overview / Energy Trend / display story 的既有資料來源契約。

## Non-Goals

- 本 change 不直接實作 raw history 寫入與查詢 API。
- 不把現有 playback 或 history surfaces 立即改成讀 raw MQTT history。
- 不引入外部資料庫或遠端串流基礎設施。

## Capabilities

### New Capabilities

- `raw-mqtt-history-persistence`: 定義原始 MQTT 訊息的本機持久化、保留政策、查詢邊界與與現有聚合資料鏈的關係。

### Modified Capabilities

(none)

## Impact

- Affected specs: raw-mqtt-history-persistence
- Affected code:
  - Modified: openspec/changes/propose-raw-mqtt-history-persistence/proposal.md
  - New: openspec/changes/propose-raw-mqtt-history-persistence/specs/raw-mqtt-history-persistence/spec.md
  - New: openspec/changes/propose-raw-mqtt-history-persistence/design.md
  - New: openspec/changes/propose-raw-mqtt-history-persistence/tasks.md
