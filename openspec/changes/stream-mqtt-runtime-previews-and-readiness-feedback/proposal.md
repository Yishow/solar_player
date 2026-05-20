## Why

`MQTT Settings` 目前會每 5 秒 polling topic mappings，雖然能看 readiness coverage，但 live runtime preview 仍不夠即時，也沒有和 display sync/readiness feedback 形成一致的 operator 回饋。對排查現場 topic 問題來說，這頁還可以更像真正的調試面。

## What Changes

- 讓 `MQTT Settings` 的 runtime preview 與 readiness feedback 更即時，減少只靠定時 polling 的遲滯。
- 對齊 broker 連線、topic 收值、mapping coverage 與 readiness finding 的回饋語意，讓操作員可直接判斷「topic 有沒有活、是否足夠支撐 display」。
- 補齊相應 regression tests，鎖住即時 preview 與 readiness 更新的行為。

## Non-Goals

- 不新增新的 MQTT 管理功能，例如 broker topology 或 retained message 管理。
- 不改動後端 MQTT ingestion 的核心資料模型。

## Capabilities

### New Capabilities

- `mqtt-settings-runtime-preview-streaming`: 定義 MQTT Settings 如何以近即時方式呈現 topic runtime preview 與 broker 收值狀態。

### Modified Capabilities

- `mqtt-settings-display-coverage`: 將 MQTT display coverage 從靜態映射檢查擴展為包含近即時 runtime feedback 的治理面。

## Impact

- Affected specs: `mqtt-settings-runtime-preview-streaming`, `mqtt-settings-display-coverage`
- Affected code:
  - Modified: `apps/web/src/pages/MqttSettings/index.tsx`
  - Modified: `apps/web/src/pages/MqttSettings/viewModel.ts`
  - Modified: `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx`
  - Modified: `apps/web/src/pages/MqttSettings/viewModel.test.ts`
  - Modified: `apps/server/src/routes/settings-mqtt.ts`
  - Modified: `apps/server/src/realtime/SocketService.ts`
