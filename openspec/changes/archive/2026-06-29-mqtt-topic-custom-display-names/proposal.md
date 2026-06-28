## Why

目前 Topic 工作區每張卡片的名稱由寫死的 `metricLabelMap` 依 `metricKey` 推導,操作者無法修改。同一份顯示名稱又被重複寫死在各 playback 頁 viewModel、`displayStoryService` 與 `CircuitConfig`,造成命名分散、無單一事實來源,且操作者無法為實際接入的 topic 命名。本變更讓操作者在 Topic 工作區自訂中英文名稱,並以此作為 playback 顯示名稱的唯一來源。

## What Changes

- Topic 工作區每個 topic mapping 新增可編輯的「中文名稱」與「英文名稱」欄位,可在現有的 topics 草稿儲存流程一併存檔。
- `topic_mappings` 資料表新增 `name_zh`、`name_en` 兩欄(新 migration),server route 讀寫並序列化這兩個欄位。
- playback 顯示名稱改以對應 `metric_key` 的 topic 自訂名稱為唯一來源;當自訂名稱為空時,fallback 回各頁原本的內建預設名稱(維持現狀,不產生空白)。
- 名稱解析集中於 server 端 story 解析路徑(`displayStoryService`),涵蓋 Overview、Solar、Factory Circuit、Sustainability 中以 `metric_key` 對應的卡片 label。
- **BREAKING(治理面)**:Factory Circuit 負載列名稱原本由 `/display-pages/editor` 經 `CircuitConfig.nameZh/nameEn` 維護,改為以 topic 自訂名稱為優先來源。此取捨與 editor capability-first 原則衝突,於 design.md 記錄並由使用者確認。

## Capabilities

### New Capabilities

- `mqtt-topic-display-name-authoring`: 操作者可在 Topic 工作區為每個 topic mapping 編輯並持久化自訂中英文顯示名稱,名稱隨既有 topics 儲存流程存檔,並在欄位留空時保留內建預設。
- `playback-metric-display-name-source`: playback 頁面以 topic 自訂名稱作為各 `metric_key` 顯示名稱的唯一來源,於名稱留空時 fallback 回內建預設,確保不出現空白或回歸。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - New: `mqtt-topic-display-name-authoring`
  - New: `playback-metric-display-name-source`
- Affected code:
  - New:
    - `apps/server/src/db/migrations/014_topic_display_names.sql`
  - Modified:
    - `packages/shared/src/types.ts`
    - `apps/server/src/db/seed.ts`
    - `apps/server/src/routes/settings-mqtt.ts`
    - `apps/server/src/services/displayStoryService.ts`
    - `apps/web/src/pages/MqttSettings/viewModel.ts`
    - `apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx`
    - `apps/web/src/pages/MqttSettings/mqttSettings.css`
    - `apps/web/src/pages/Overview/viewModel.ts`
    - `apps/web/src/pages/Solar/viewModel.ts`
    - `apps/web/src/pages/FactoryCircuit/viewModel.ts`
    - `apps/web/src/pages/Sustainability/viewModel.ts`
  - Removed: (none)
- 邊界限制:Images 頁無 metric,維持不受影響;Sustainability 僅能覆蓋有 `metric_key` 對應的卡片,aggregate-only 數據不在範圍內。
