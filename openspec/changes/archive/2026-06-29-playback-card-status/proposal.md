## Why

Playback 五頁（overview、solar、factory-circuit、images、sustainability）在指標尚未接好資料來源時，KPI／數據卡只能顯示假數值、空值或 `--`，無法明確告訴現場「這張卡正在設定中」。此外，營運上需要能逐卡開啟／隱藏，但目前只有 Overview 的 KPI 卡與 dashboard widget 在 `/display-pages/editor` 提供顯示開關，其餘四頁與 card rail 卡（metric-highlight／household-equivalent）雖然資料模型已支援 `visible`，editor 卻沒有暴露控制項。需要一個一致、可由 editor 維護的「卡片狀態」能力。

## What Changes

- 為五個 playback 頁的**資料卡／KPI 卡**（顯示「數值＋標題」的卡，例如 Overview 五張 KPI 卡、Solar KPI row、Sustainability 大數字卡與四口之家卡、FactoryCircuit 迴路負載卡、Images caption 卡、以及 card rail 的 metric-highlight／household-equivalent）新增一個由 `/display-pages/editor` 設定的「設置中」顯示狀態：
  - **正常**：顯示真實數值（現行行為）。
  - **設置中**：保留卡片樣式與標題，僅把數值位置替換為「設置中」文字；**只覆蓋顯示**，背後 binding／計算照常運作、不被停用。
- 把既有的「開啟／隱藏」editor 控制項覆蓋範圍從 Overview 擴充到 Solar、Sustainability、FactoryCircuit、Images 與 card rail 卡，使每張資料卡都能在 editor 切換顯示。
- 「設置中」與「隱藏」維持為兩個獨立、正交的設定欄位：隱藏沿用既有 `visible` flag；設置中為新增的 per-card `status` 欄位。卡片同時可為「隱藏」或「設置中」，預設皆為正常顯示。
- 兩種設定都走既有 draft／live 持久化流程，並提供 seed fallback 與 targeted tests。
- 不納入 flow node、連接線、ornament 等非資料卡的裝飾元素。

## Non-Goals

- 不改動任何卡片背後的資料 binding、metric 計算或 MQTT 來源；「設置中」純粹是前台顯示覆蓋。
- 不新增第四種狀態（例如維護中、離線）；本次僅正常／設置中兩值，加上既有顯示／隱藏。
- 不調整卡片版面、字級、樣式或 FHD 視覺；僅新增狀態的資料模型、editor 控制與 runtime 呈現。
- 不把 flow node、連接線、裝飾元素納入狀態控制範圍。
- 不重寫 route shell、server API 或 SQLite／MQTT 架構。

## Capabilities

### New Capabilities

- `playback-card-configuring-status`: 每張 playback 資料卡可由 editor 設定「設置中」狀態，runtime 在該狀態下以「設置中」文字覆蓋數值位置、保留標題與卡片樣式，且不影響背後 binding／計算；狀態經 draft／live 持久化，缺省時視為正常顯示。

### Modified Capabilities

- `display-card-visibility-toggle`: 既有「editor 對宣告 visible 欄位的卡暴露顯示開關」要求，覆蓋範圍擴充到 Solar、Sustainability、FactoryCircuit、Images 與 card rail 卡（metric-highlight／household-equivalent），不再僅限 Overview。

## Impact

- Affected specs:
  - New: `playback-card-configuring-status`
  - Modified: `display-card-visibility-toggle`
- Affected code:
  - New: (none — 預期沿用既有檔案；具體新增於 design 階段確認)
  - Modified:
    - packages/shared/src/displayPageCardRail.ts
    - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Solar/displayPageConfig.ts
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/Sustainability/displayPageConfig.ts
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
    - apps/web/src/pages/FactoryCircuit/index.tsx
    - apps/web/src/pages/Images/displayPageConfig.ts
    - apps/web/src/pages/Images/index.tsx
  - Removed: (none)
