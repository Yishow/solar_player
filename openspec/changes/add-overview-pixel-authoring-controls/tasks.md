## 1. 擴充 shared cardStyle（trendHeight + contentAlign=end）

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
