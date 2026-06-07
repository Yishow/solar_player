## 1. 滿版節奏重排：Compose Overview hero, density row, and KPI row without overlap

- [x] 1.1 在 `apps/web/src/pages/Overview/layout.ts` 與 `apps/web/src/pages/Overview/displayPageConfig.ts` 重排座標：放大/定位 hero 圖容器、調整 density widget 列（weather/phasePower/generationTrend）垂直座標到 hero 圖底部之下、KPI 卡列之上，使 hero 帶、widget 列、KPI 列三段垂直區間互不重疊且間距均勻。
- [x] 1.2 更新 `apps/web/src/pages/Overview/layout.test.ts` 對應座標斷言，並新增一條斷言：以座標計算驗證 density widget 列、hero 圖帶、KPI 卡列三段垂直區間不重疊。

## 2. Hero 重排與資料排版：Compose Overview hero, density row, and KPI row without overlap

- [x] 2.1 在 `apps/web/src/pages/Overview/displayPageConfig.ts` 調整 hero typography（eyebrow/title/subtitle 字級、行距、letter-spacing）與 `heroCopyLayout`，使雙語標題與放大後 hero 圖形成清楚主從、收掉中段留白。
- [x] 2.2 在 `apps/web/src/pages/Overview/overview.css` 精緻化 KPI 卡與三個 density widget 內 value/unit/label 的字級層次與間距，使數據為視覺焦點、unit/label 為次級。

## 3. Frosted glass 卡片：Render Overview surfaces with frosted-glass quality scoped to Overview

- [x] 3.1 在 `apps/web/src/pages/Overview/overview.css` 為 `.overview-kpi-card` 與 `.overview-dashboard-widget`（含 weather/phase-power/generation-trend 子類）加入 frosted glass：半透明背景、`backdrop-filter: blur(≤18px)`、1px 細邊、柔光 box-shadow、一致圓角；不改 `apps/web/src/components/displayPageCards.css`。
- [x] 3.2 視需要調整 `apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx`、`PhasePowerTableWidget.tsx`、`GenerationTrendWidget.tsx` 的 className/結構以承接 frosted glass 與排版層次（不改 props 形狀、不改共用 card component）。
- [x] 3.3 在 `apps/web/src/pages/Overview/style.test.ts`（或新增 Overview style 測試）斷言 frosted glass 規則（backdrop-filter 或半透明背景）存在於 overview.css 且未出現在共用 `displayPageCards.css`。

## 4. Scope 守護：Preserve light FHD canon and Overview-only scope

- [x] 4.1 驗證改動僅限 Overview-scoped 檔案：以 `git diff --name-only` 確認未碰 `displayPageCards.css`/`displayPageCards.tsx`、nav/route、server、SQLite、MQTT；確認無 page-local hardcode 繞過既有 config。

## 5. 驗證與 witness

- [x] 5.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm run build`，全綠。
- [x] 5.2 以 agent-browser 在 1920x1080 擷取 `/overview`，對照 `docs/reference/Better/01.Overivew (大).png` 確認 hero 張力、frosted glass、資料排版、滿版節奏四面向到位，witness 與例外記入本 change artifact。

## 6. Requirement 驗收對映

- [x] 6.1 驗收 "Render Overview surfaces with frosted-glass quality scoped to Overview"：Overview-scoped frosted glass 規則存在且未改共用 base（任務 3）。
- [x] 6.2 驗收 "Compose Overview hero, density row, and KPI row without overlap"：三段垂直區間不重疊、hero 為主視覺（任務 1、2）。
- [x] 6.3 驗收 "Preserve light FHD canon and Overview-only scope"：維持淺色、僅動 Overview-scoped、無 hardcode 繞過 editor（任務 4）。
