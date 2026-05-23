## Why

`MQTT Settings` 目前右側三欄同時重覆顯示 topic runtime、preview 與 mapping 資訊，資訊密度高但編輯動線分散。既然這頁要加入 weather 設定卡，就應該順手把 topic 區塊整合成偏編輯的總覽，避免再疊出一張功能孤島。

## What Changes

- 將 `即時 Topic 清單` 與 `Topic Mapping` 重組為偏編輯的 topic 總覽卡，收斂重覆 runtime 與 mapping 資訊。
- 保留 coverage / runtime summary，但把它放進新的 topic 總覽卡頂部，讓操作人員在同一張卡內看狀態並直接編輯。
- 新增 weather 設定卡，提供 CWA 地點切換、header 顯示組合、可自訂欄位與 preview。
- 將 weather 啟用/停用放進 weather 卡本身，而不是額外塞在 `Test Connection` 左側做獨立 toggle。

## Non-Goals

- 本 change 不串接新的 weather provider，也不負責 server 端 weather cache。
- 本 change 不重新設計 broker 基本設定卡與 `Save Settings` / `Test Connection` 的主流程。
- 本 change 不修改 display 頁內容，只處理 `MQTT Settings` 管理頁的資訊架構與 weather authoring。

## Capabilities

### New Capabilities

- `mqtt-settings-weather-management`: 在 `MQTT Settings` 內提供 weather 設定、地點切換、preset/custom 欄位選擇與 header preview。

### Modified Capabilities

- `mqtt-settings-runtime-preview-streaming`: runtime preview 需要搬到新的 topic 總覽卡結構內，仍要保留 live / fallback 語意，不可因版面整合而退化。
- `mqtt-settings-display-coverage`: coverage findings 需要留在 topic 編輯主工作區，讓操作人員在同一張卡內處理 mapping 缺口。

## Impact

- Affected specs: `mqtt-settings-weather-management`, `mqtt-settings-runtime-preview-streaming`, `mqtt-settings-display-coverage`
- Affected code:
  - New:
    - `apps/web/src/pages/MqttSettings/weatherFieldPresets.ts`
    - `apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts`
  - Modified:
    - `apps/web/src/pages/MqttSettings/index.tsx`
    - `apps/web/src/pages/MqttSettings/viewModel.ts`
    - `apps/web/src/pages/MqttSettings/viewModel.test.ts`
    - `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx`
    - `apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts`
    - `apps/web/src/pages/MqttSettings/mqttSettings.css`
    - `apps/web/src/pages/MqttSettings/layout.ts`
    - `apps/web/src/pages/managementDisplaySync.test.ts`
  - Removed: (none)
