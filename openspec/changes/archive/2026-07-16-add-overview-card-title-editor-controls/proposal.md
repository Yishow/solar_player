## Why

Overview 底部五張 KPI 卡片雖已能在 `/display-pages/editor` 調整樣式、圖示、footer 與幾何，但標題仍固定取自 runtime metric 顯示名，操作人員無法針對展示頁文案個別覆寫。這使 editor-first 的展示設定能力不完整，也迫使單純文案調整必須改 MQTT topic 名稱或程式碼。

## What Changes

- 為 Overview 五張 KPI 卡各自加入可選的標題覆寫欄位，並由既有 display-page draft/live config 儲存。
- 在 Overview editor inspector 顯示每張 KPI 卡的「標題文字」輸入欄位。
- playback 與 editor preview 在標題覆寫為非空白時顯示覆寫值；空白、缺少欄位或舊版資料則維持既有 runtime metric 顯示名。
- 保留現有 MQTT/story metric display-name 路徑作為 fallback，不改變數值、單位、footer、icon 或資料來源。

## Non-Goals

- 不新增 server API、SQLite migration 或新的設定儲存通道。
- 不修改 Solar、Factory Circuit、Images 或 Sustainability 的卡片標題行為。
- 不開放 KPI 副標題、數值、單位或 MQTT topic 名稱編輯。
- 不改變 Overview 卡片版型、樣式或幾何。

## Capabilities

### New Capabilities

- `overview-kpi-title-authoring`: 定義 Overview 五張 KPI 卡片標題在 editor、draft/live config、preview、playback 與 fallback 間的一致行為。

### Modified Capabilities

- `playback-metric-display-name-source`: 補充 Overview editor 的非空白卡片標題覆寫優先於 metric 顯示名，而未設定覆寫時仍使用現有 MQTT/story 或內建 fallback。

## Impact

- Affected specs: overview-kpi-title-authoring, playback-metric-display-name-source
- Affected code:
  - New: (none)
  - Modified:
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/runtimeContent.tsx
    - apps/web/src/pages/Overview/displayPageConfig.test.ts
    - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - Removed: (none)
- APIs, dependencies, and storage schema: no changes
