## Why

優化 MQTT 設定頁面中 Topic 工作區 (Topic Workspace) 的卡片 (Card) 佈局與內容顯示，以提升管理端 UI 的質感與易讀性，減少垂直空間擠壓，使即時數值、輸入欄位與 Metadata 資訊呈現更具層次感。

## What Changes

- **美化卡片設計**：重構 `topic-workspace-row`，採用現代 Dashboard 卡片排版，搭配精緻的邊框、微弱的陰影與 hover 位移微動畫，強化互動感。
- **重新佈局欄位與控制項**：
  - 將「啟用/移除」控制項移至卡片右上角或適當側邊，減少垂直堆疊。
  - 優化 Topic 與 Unit 輸入框的寬度比例，使其更符合輸入內容長度。
  - 放大即時 runtime 數值與單位，提升資訊可視度。
- **優化 Metadata 排版**：將「最後收值」、「最後更新」、「資料品質」等 metadata 以點號分隔並水平排列在卡片底部，降低視覺噪音。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
    - apps/web/src/pages/MqttSettings/mqttSettings.css
