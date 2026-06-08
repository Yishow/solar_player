## Why

為了將 `/overview` 的 UI 質感推向 `docs/reference/Better/01.Overivew (大).png`，除了調整幾何、卡片內距與背景照片版位（由 `add-overview-pixel-authoring-controls` 變更負責）外，更需要落實設計圖中具備「業務層次感」與「高資訊密度」的元件細節。

這包括：KPI 卡片底部多樣的 Footer（今日發電量顯示進度條與目標、累積發電量顯示歷史建置說明、CO2 減量顯示種植樹木棵數），以及警示通知組件支援常駐顯示四大門檻監控狀態（以防正常無警示時大片留白）。這些功能不應寫死在代碼中，而必須遵循 editor-capability-first 原則，將控制項暴露給 `/display-pages/editor` 進行動態配置與持久化。

## What Changes

- **KPI 卡片頁尾自訂性 (Footer Type Authoring)**：
  - 擴充 `OverviewKpiCardConfig`：新增 `footerType`（可選 `sparkline` | `progress` | `text` | `co2-tree` | `none`）、`footerText` (string) 與 `targetValue` (number) 控制屬性。
  - 在 `Overview/index.tsx` 的 KPI 卡片渲染處，依 `footerType` 條件分支渲染對應的元件（進度條、自訂小字、植樹換算、Sparkline 等），移除硬編碼的 sparkline 限制。
  - 在 `displayPageConfig.ts` 的 `overviewDisplayPageEditorRegions` 中，為 5 張 KPI 卡片各自加入對應的頁尾控制欄位，利用 `visibleWhen` 聯動顯示 `footerText` 或 `targetValue`。
  - 為 KPI 卡片配置 Better 版的 seed 預設值（如 `today` 預設 progress、`total` 預設 text、`co2*` 預設 co2-tree）。

- **警示組件常駐門檻狀態 (Alert Thresholds Authoring)**：
  - 擴充 `OverviewDashboardWidgetConfig`（特別是 `alertNotifications`）：新增 `alwaysShowThresholds` (boolean) 屬性。
  - 修改 `AlertNotificationsWidget.tsx`：當 `alwaysShowThresholds` 為真時，即使 live alerts 清單為空，也常駐渲染「即時功率過高」、「逆變器溫度過高」、「電網電壓異常」、「通訊中斷」四大規則的監控門檻與綠色「正常」標記，並在右上方加上聲音提醒開關 UI，防止版面留白。
  - 在編輯器 region schema 中，為 `alertNotifications` widget 加入對應的 toggle 欄位。

- **天氣與趨勢組件質感細修**：
  - 更新 `WeatherCardWidget.tsx`：將濕度、風速、雨量三個小指標改為橫排 Flex 佈局。
  - 更新 `GenerationTrendWidget.tsx`：將發電趨勢折線改為漸層面積圖 (Area Chart)，並在組件頂部模擬 Today, 7D, 30D 時間範圍與更新頻率切換的靜態 Tab 項目，提升專業感。

## Non-Goals

- 不在程式碼中寫死 Better 版的數值，所有視覺調整均必須由 display config 或 editor style 驅動。
- 不影響其他四個播放頁面（Solar / Factory Circuit / Images / Sustainability）的編輯器配置與外觀。
- 不改動 Fastify server 端的 API 結構、SQLite 資料庫結構或 MQTT 底層傳輸機制。
- 本變更專注於 Footer 多樣性與 widget 內容邏輯，不與 `add-overview-pixel-authoring-controls` 中關於幾何、內距與背景位置的工作重疊或衝突。

## Capabilities

### New Capabilities

- `overview-kpi-footer-authoring`: 定義 Overview KPI 卡片的頁尾展示型態（Footer Type）config schema、其 editor inspector 欄位，以及 runtime 依 footerType 動態渲染不同元件的綁定契約與 seed 預設。
- `overview-alert-thresholds-authoring`: 定義警示通知組件「常駐顯示監控門檻」的 config schema、其 editor inspector 欄位，以及 runtime 當開關啟用時渲染常駐規則狀態的綁定契約與 seed 預設。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - 新增 `overview-kpi-footer-authoring`
  - 新增 `overview-alert-thresholds-authoring`
- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
    - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
    - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
    - apps/web/src/pages/Overview/overview.css
  - New:
    - openspec/changes/add-overview-kpi-footers-and-widget-details/specs/overview-kpi-footer-authoring/spec.md
    - openspec/changes/add-overview-kpi-footers-and-widget-details/specs/overview-alert-thresholds-authoring/spec.md
