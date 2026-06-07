## Why

意圖參考 docs/reference/Better/01.Overivew (大).png 在 Overview 下方放了發電趨勢、警示通知等 widget；長官可能臨時要求 Overview 直接顯示「發電趨勢」與「警示通知」。目前 Overview 只有 Hero 與 5 張 KPI 卡片，沒有這類 widget card。本次新增兩個「接真實 runtime 資料」的 widget，預設隱藏，透過既有顯示/隱藏能力按需上牆，避免長官問「為什麼沒有」，同時平時維持 docs/reference/FHD/01-1.Overview (大).png 的乾淨版面。

三相電力（R/S/T）widget 不在本次範圍：系統目前沒有 per-phase 三相資料源，要接真實資料須先新增 MQTT 三相 topic 與資料模型，屬獨立的資料層 change。

## What Changes

- 新增 Overview「發電趨勢」widget card：綁既有 `GET /api/metrics/history`（及 Overview runtime 既有 `trendSeries`）渲染發電趨勢，不使用 mock 資料。
- 新增 Overview「警示通知」widget card：綁既有警示來源（`displayStoryService` 的 alertTone/fallbackReason 與 device readiness findings）列出近期警示，不使用 mock 資料。
- 兩 widget 各註冊為 Overview 可編輯 region（具 geometry 與顯示/隱藏 toggle），seed 預設 `visible: false`；operator 於 `/display-pages/editor` 啟用並用既有 canvas 拖曳/縮放/吸附定位。
- 重用 `extend-display-card-visibility-and-aspect-lock`（顯示/隱藏 toggle、等比例縮放）作為前置能力；不重做拖曳、吸附、版面安全、draft/live 發布。

## Capabilities

### New Capabilities

- `overview-dashboard-widgets`: Overview 可顯示綁定真實 runtime 資料的選用 widget card（發電趨勢、警示通知），各為可編輯且可顯示/隱藏的 region，預設隱藏。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `overview-dashboard-widgets`
- 依賴：`extend-display-card-visibility-and-aspect-lock`（提供顯示/隱藏 toggle 能力）須先實作
- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/viewModel.ts
  - New:
    - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
    - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
    - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - Removed: (none)
