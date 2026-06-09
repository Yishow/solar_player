## Why

`/overview` 的卡片已具備兩排版型與多種 footer 內容，但視覺尚未收斂到 `docs/reference/Better/01.Overivew (大).png` 樣稿：KPI 卡的 icon 仍是寫死的白色圓形＋二元 green/gold accent，無法呈現樣稿的「每卡分色＋圓角方形」icon chip；發電趨勢卡雖已是填色面積圖，但為 angular 折線且 dev runtime 資料近乎定值，曲線缺乏樣稿的平滑日照鐘形與說明標籤。要達成「卡片內容物 ≥90% 相似」，缺口集中在 icon chip 樣式能力與趨勢卡曲線質感。

## What Changes

- 在 `/display-pages/editor` 的 Overview 卡內樣式 inspector，為每張 KPI 卡與 density widget 新增 **icon chip 樣式**欄位：底色、前景（glyph）色、與形狀（圓形或圓角方形），透過既有 draft/live 機制持久化，並提供 seed fallback 與 reset/validation。
- 將寫死在 Overview CSS 的 icon shell / glyph 外觀改由 runtime CSS 變數驅動，移除只有 green/gold 的二元 accent 限制；treatment 維持 Overview-only class 範圍，不動共用 card base 與其他 playback 頁。
- 發電趨勢卡（generation trend widget）升級為 **完整資料視覺圖表**：平滑填色曲線、分層漸層面積、Y 軸刻度與水平格線、X 軸時間標籤、每點資料點、與 peak 標記；維持「只吃 runtime trend 資料、無資料時顯示空狀態」的既有規則。
- server 端將趨勢語意校正為**瞬時發電功率**：把 `metric_snapshots.generation_power` 納入歷史寫入與讀取，Overview 趨勢優先讀取瞬時功率歷史，缺值時 fallback 既有 `generation` 序列。
- 在 mock mode 下新增 dev mock feed，將模擬瞬時功率寫進既有 runtime live-metrics path，讓標準 accumulator / snapshot-writer pipeline 自然生成日照鐘形歷史；production 路徑不改。
- 校正 Overview 五張 KPI 卡的 seed footer 對映（footerType / targetValue / footerText）與卡片視覺參數（shadow strength、corner radius、surface opacity、icon box size），使其對齊樣稿；沿用既有 card-style override，不新增 footer 種類。
- 確立 Better 樣稿為 Overview 卡片的**補充視覺 canonical**；`docs/reference/FHD/` 仍為頁面 canonical。

## Non-Goals

- 不修改 shared shell：`apps/web/src/components/AppHeader.tsx` 頂部狀態列與 `apps/web/src/components/AppFooterNav.tsx` 底部導覽，包含樣稿與現行五頁 IA（Factory Circuit / Sustainability）的差異，皆不在本次範圍。
- 不把 Better 升格為取代 FHD 的頁面 canonical，也不為其他四個 playback 頁導入 Better 樣稿。
- 不新增 KPI footer 種類，不重排卡片絕對座標系統。
- 不以 page-local hardcode 繞過 editor；icon chip 與趨勢卡樣式須由 editor capability 表達。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `overview-card-internal-style-authoring`: 新增每卡 icon chip 底色、前景色與形狀的可編輯欄位，持久化與 seed fallback。
- `overview-dashboard-widgets`: 發電趨勢卡升級為平滑填色曲線＋座標軸／格線／資料點／峰值標記的完整圖表，維持 runtime-only 資料與空狀態規則。
- `overview-fhd-better-quality`: 將 Better 樣稿納入 Overview 卡片視覺 fidelity 目標（icon chip 與趨勢卡曲線質感），FHD 仍為頁面 canonical。
- `overview-trend-data-integrity`: 趨勢序列改以瞬時發電功率（日照鐘形）為語意；新增 dev mock feed 讓 runtime pipeline 在無 broker 時也產生鐘形歷史。

## Impact

- Affected specs: overview-card-internal-style-authoring, overview-dashboard-widgets, overview-fhd-better-quality, overview-trend-data-integrity
- Affected code:
  - Modified:
    - apps/web/src/pages/shared/displayCardStyleConfig.ts
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
    - apps/web/src/components/Sparkline.tsx
    - apps/server/src/db/seed.ts
    - apps/server/src/services/SnapshotWriterService.ts
    - apps/server/src/services/displayStoryService.ts
    - apps/server/src/server-startup.ts
    - apps/server/src/routes/metrics-history.ts
  - New:
    - apps/server/src/db/migrations/013_generation_power.sql
    - apps/server/src/services/MockMetricsFeedService.ts
    - apps/server/src/services/generationTrendSeries.ts
    - apps/server/src/metrics/solarGenerationProfile.ts
    - apps/web/src/pages/Overview/widgets/GenerationTrendChartView.tsx
    - apps/web/src/pages/Overview/widgets/generationTrendChart.ts
  - Removed: (none)
