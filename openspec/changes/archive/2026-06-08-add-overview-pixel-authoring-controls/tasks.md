## Merged Tasks

以下任務原本來自 `add-overview-kpi-footers-and-widget-details`，現已併入本 umbrella change 管理。

## 1. 擴充 Configuration 與 Schema

- [x] 1.1 擴充 `OverviewKpiCardConfig` 與 `OverviewDashboardWidgetConfig` 的屬性型別（包含 `footerType`、`footerText`、`targetValue` 與 `alwaysShowThresholds`）。落實「決策一：將 Footer 業務屬性定義於 KPI Card Config 內而非 Card Style」。驗證：執行 `pnpm run build:shared` 與 `pnpm run build:web` 通過。
- [x] 1.2 在 `apps/web/src/pages/Overview/displayPageConfig.ts` 中，為 5 張 KPI 卡片與 `alertNotifications` widget 配置符合 Better 設計圖的 seed 預設值（`today` 為 progress 目標 5000, `total` 為 text 說明, `co2Today`/`co2Total` 為 co2-tree 換算，且 `alwaysShowThresholds` 預設為 true）。落實「決策三：在 displayPageConfig 中落實新舊配置相容的 Fallback 邏輯」與「Requirement: Author Overview KPI Card Footer Types」的 fallback 契約。驗證：新增 `apps/web/src/pages/Overview/displayPageConfig.test.ts` 的單元測試以驗證歷史 config 合併時新屬性的 fallback 回退邏輯。
- [x] 1.3 在 `displayPageConfig.ts` 中的 `overviewDisplayPageEditorRegions` 擴充 region schema，為 5 張 KPI 卡片新增頁尾控制項，包含 `footerType`（下拉選單）、`footerText`（文字欄位）與 `targetValue`（數字欄位），並使用 `visibleWhen` 來聯動展示；為 `alertNotifications` widget 補上 `alwaysShowThresholds` toggle 欄位。落實「決策二：利用 toggle 欄位控制 Alert Widget 呈現常駐狀態」與「Requirement: Author Overview Alert Threshold Widget Visibility」中編輯器欄位的控制要求。驗證：執行 `pnpm --filter @solar-display/web test` 驗證 schema 欄位型態解析與 visibleWhen 的條件符合預期。

## 2. 實作 Runtime 頁面元件渲染

- [x] 2.1 修改 `apps/web/src/pages/Overview/index.tsx` 的卡片頁尾渲染邏輯，依 `footerType` 條件分支渲染折線圖、進度條元件、自訂小字、或小樹/綠葉換算。落實「Requirement: Author Overview KPI Card Footer Types」的 runtime 多樣化渲染。驗證：在 `apps/web/src/pages/Overview/render.test.ts` 中新增測試案例，模擬不同的 `footerType` 配置，斷言 runtime 能正確渲染進度條百分比、自訂說明文字與種植樹木字串。
- [x] 2.2 修改 `AlertNotificationsWidget.tsx`：當 `alwaysShowThresholds` 開關啟用時，即使當前 alerts 陣列為空，仍常駐顯示四個核心規則的監控門檻狀態（即時功率過高、逆變器溫度過高、電網電壓異常、通訊中斷）與綠色勾勾。落實「Requirement: Author Overview Alert Threshold Widget Visibility」與「決策二：利用 toggle 欄位控制 Alert Widget 呈現常駐狀態」的常駐規則展示。驗證：新增 `AlertNotificationsWidget.test.tsx` 單元測試，斷言在 alerts 為空但 `alwaysShowThresholds` 為真時，核心四行監控規則標記能正確出現在 DOM 中，無「無警示」空狀態。
- [x] 2.3 修改 `WeatherCardWidget.tsx` 的 Flex 佈局使小指標橫排，並調整 `GenerationTrendWidget.tsx` 渲染面積圖與頂部的靜態 Tab 切換選單。落實「Requirement: Refine Lower Dashboard Widgets Appearance」。驗證：執行 `overviewWidgets.test.tsx` 驗證天氣與趨勢組件正常被渲染，並通過程式碼檢視確認 DOM 與樣式。

## 3. CSS 質感打磨與手動驗證

- [ ] 3.1 在 `apps/web/src/pages/Overview/overview.css` 優化卡片的 frosted-glass 毛玻璃效果（更高透光的背景色 `rgba(255, 255, 255, 0.75)`、細白邊框與更輕的灰色陰影），並擴大背景大圖左側的淡出漸層。驗證：手動在瀏覽器開啟 `/display-pages/editor?page=overview`，調整卡片的內部對齊與頁尾類型並儲存 draft，確認預覽頁面即時反映 Better 視覺效果，且沒有其他頁面樣式 regression。## 1. 擴充 shared cardStyle（trendHeight + contentAlign=end）

- [x] 1.1 在 `apps/web/src/pages/shared/displayCardStyleConfig.ts` 擴充既有 `DisplayCardStyleConfig`：新增 `trendHeight`（number，`createDisplayCardStyleConfig` seed 預設 56），`buildDisplayCardStyleVars` 輸出 `--display-card-trend-height`，`buildDisplayCardStyleFields` 補對應 number 欄位；`DisplayCardValueRowAlign` 擴為 `start|center|end`、`displayCardValueRowAlignOptions` 補 End、`resolveValueRowAlign` 接受 end。為 additive，不傳時走 seed。落實需求「Render Overview cards from internal-style config without stylesheet hardcoding」「Author internal card style per Overview card and widget」（trend 高度與 end 對齊部分）。驗證：新增/更新 `displayCardStyleConfig` 測試斷言 trendHeight seed=56、缺值回退、`--display-card-trend-height` 有輸出、valueRowAlign 接受 end，先紅後綠。

## 2. density widget 樣式 config 與 seed

- [x] 2.1 [P] 在 `apps/web/src/pages/Overview/displayPageConfig.ts` 新增 `widgetStyles`（key＝weather/phasePower/generationTrend/alertNotifications，型別＝既有 `DisplayCardStyleConfig`），seed 預設＝現行 widget 視覺等價值（含 generationTrend 的 `trendHeight=56`）；`resolveOverviewModernDefaultConfig` 比照 `cardStyles` 合併、缺欄位回退 seed。落實需求「Seed internal-style defaults preserve current appearance」「Author internal card style per Overview card and widget」（density widget 部分）。驗證：config 解析測試斷言 widgetStyles seed 等於現值、缺欄位回退 seed，先紅後綠。

## 3. density widget 樣式 runtime 綁定

- [x] 3.1 在 `apps/web/src/pages/Overview/index.tsx` 為四個 density widget 以 `buildDisplayCardStyleVars(resolvedConfig.widgetStyles[key])` 套 inline 變數（比照 KPI 卡），並把 `GenerationTrendWidget` 趨勢區高度改以 `var(--display-card-trend-height, 56px)`；`overview.css`／`displayPageCards.css` 引用處改為帶現值 fallback 的 `var(--display-card-*)`，不寫死 Better 數值。落實需求「Render Overview cards from internal-style config without stylesheet hardcoding」。驗證：`apps/web/src/pages/Overview/render.test.ts` 斷言 widgetStyles 值出現在對應元素 inline 變數、趨勢高度由變數驅動，先紅後綠。

## 4. density widget 樣式 inspector 欄位

- [x] 4.1 在 `apps/web/src/pages/Overview/displayPageConfig.ts` 的 Overview region schema 為四個 density widget 以 `buildDisplayCardStyleFields({ path: ["widgetStyles", key] })` 接上 inspector 欄位（含新增的 trendHeight 與 end 對齊選項），沿用既有 typed inspector 與 `inspectorFields.tsx` 渲染，draft/live 可持久化。落實需求「Author internal card style per Overview card and widget」。驗證：inspector/region 測試斷言每個 density widget 都有對應內部樣式欄位（含 trendHeight、contentAlign 含 end）且型別正確，先紅後綠。

## 5. 背景版位 config 與 seed（已由既有 hero media 涵蓋）

- [x] 5.1 背景版位（band 高度／object-position／底緣淡出）已由既有 `heroContainer` 幾何 + `heroMedia.alignX/alignY` + `heroMedia.effects` 提供且 seed 等價現況；design 原本「`inset:0` 滿版」前提已過時（背景現由定位的 `.overview-hero-banner` 渲染）。本 change 不新增平行 `backgroundPlacement` config（避免與 heroContainer/heroMedia 重複）。落實需求「Seed background placement default preserves current appearance」（由既有 seed 提供）。驗證：`apps/web/src/pages/Overview/backgroundPlacement.test.ts` guard 測試斷言既有 hero media 能力涵蓋 band 高度／object-position／fade。

## 6. 背景版位 runtime 綁定（已由既有 hero media 涵蓋）

- [x] 6.1 背景照片 runtime 已由 `buildDisplayPageMediaPresentation` 以 inline style 套用 `heroMedia` 的 object-position（alignX/alignY）、fitMode 與 fade overlay，幾何由 `heroContainer` inline 套用，無 hardcode `inset:0`。落實需求「Render Overview background from placement config replacing the hardcoded full-bleed rule」（既有實作已符合）。驗證：`backgroundPlacement.test.ts` 斷言 hero media region geometry/align/effect surface 存在，背景以既有 config 驅動。

## 7. 背景版位 inspector 欄位（已由既有 hero media 涵蓋）

- [x] 7.1 背景版位 inspector 欄位已存在於 `overview-hero-media` region：band 高度（geometry height = `heroContainer.height`）、object-position（`heroMedia.alignX`/`alignY` 的 Align X/Y）、底緣淡出（`mediaEffectSurface`）。落實需求「Author Overview background placement」（既有欄位已可編輯）。驗證：`backgroundPlacement.test.ts` 斷言 hero media region 暴露 height geometry、alignX/alignY 欄位與 media effect surface。

## 8. 整合驗證

- [x] 8.1 執行 `pnpm --filter @solar-display/web test`、`pnpm run build:shared`、`pnpm run build:web` 全綠，且 `displaySurfaceVisualGuardrails.test.ts`／`style.test.ts` 確認其他 playback 頁與 shared card（其他頁）外觀未被 `DisplayCardStyleConfig` 擴充波及。驗證：三道指令輸出無失敗。
- [x] 8.2 手動於 `/display-pages/editor` 選 Overview，改一個 density widget 的數值字級與背景 band 高度並存 draft，確認 `/overview` draft 預覽即時反映；截一張 witness 記錄。驗證：draft 預覽變化與 witness 截圖留存。
