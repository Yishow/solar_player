## Why

目前 `/settings/mqtt` 把 MQTT 資料來源模式與 Topic mapping 分成兩張 card，操作員要先理解 broker/data mode，再回到 topic row 與 playback tooltip 判斷每張卡缺什麼資料。當卡片顯示 `--` 或業主要臨時調整展示數值時，缺少一個集中頁面說明「這張卡由哪些 tag、公式或設定組成」以及「可用哪種方式補值或覆寫」。

## What Changes

- 將現有 MQTT 資料來源模式 card 與 MQTT Topic card 合併成同一個 Topic 工作區。
- Topic 工作區新增分頁切換，包含三個 tab：`資料來源模式`、`Topic mapping`、`卡片資料管理`。
- `資料來源模式` tab 承接目前 data mode、broker 欄位、連線測試與連線狀態，不再維持為獨立 card。
- `Topic mapping` tab 承接目前 topic rows、coverage findings、新增 mapping、重載、儲存與 MQTT topic 測試發佈。
- 新增 `卡片資料管理` tab，列出 playback 主要卡片的顯示值、來源 topic、依賴 metric、公式/聚合來源、缺值原因與可執行補值入口。
- 新增展示覆寫能力，允許管理員針對卡片顯示值設定啟用中的 display-only override，並可清除回復真實資料。
- 卡片資料管理必須區分真實 MQTT/累積/日報/公式資料與展示覆寫；覆寫不得寫回 raw MQTT、live metrics、daily summaries 或 cumulative counters。

## Capabilities

### New Capabilities

- `display-card-data-management`: 管理面列出 playback card 的資料來源、缺值原因、可補資料入口與 display-only 覆寫狀態。

### Modified Capabilities

- `mqtt-settings-operations-surface`: Topic 工作區從單一 topic card 改為三分頁工作區，並合併原本的 MQTT 資料來源模式 card。
- `display-monitoring-story-model`: 監控 story model 需要提供管理面可用的 card/source/dependency 診斷資料，讓卡片資料管理可說明數值如何生成。
- `sustainability-household-equivalent-storytelling`: 永續戶數卡片需在管理面揭露自發自用與計算 profile 的依賴，並支援 display-only 覆寫而不改寫推導公式。

## Impact

- Affected specs: display-card-data-management, mqtt-settings-operations-surface, display-monitoring-story-model, sustainability-household-equivalent-storytelling
- Affected code:
  - New: apps/server/src/routes/display-card-data.ts, apps/server/src/services/displayCardDataService.ts, apps/server/src/db/migrations/016_display_value_overrides.sql, apps/web/src/pages/MqttSettings/CardDataManagementTab.tsx
  - Modified: apps/server/src/app.ts, apps/server/src/routes/display-story.ts, apps/server/src/routes/sustainability-story.ts, apps/server/src/routes/settings-mqtt.ts, apps/server/src/services/displayStoryService.ts, apps/server/src/services/sustainabilityStoryService.ts, apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx, apps/web/src/pages/MqttSettings/viewModel.ts, apps/web/src/pages/MqttSettings/index.tsx, apps/web/src/pages/MqttSettings/mqttSettings.css, apps/web/src/services/api.ts, packages/shared/src/displayStory.ts, packages/shared/src/sustainabilityStory.ts
  - Removed: none
