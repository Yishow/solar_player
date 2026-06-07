## Context

Overview canvas 為 1920x1080 固定畫布，內容區 top offset 146。現況座標（layout.ts / displayPageConfig.ts）：hero copy `top 210 left 86`，hero 圖 `left 540 top 182 w1340 h690`（底部約 872），density widget 列 `top 452`，KPI 卡列 `top 758 h232`。density widget（phasePower `left 470`、generationTrend `left 1116`）目前與 hero 圖區域水平重疊，是版面鬆散主因之一。卡片樣式集中在 `overview.css` 的 `.overview-kpi-card`、`.overview-dashboard-widget` 與 widget 子類；共用 base 在 `displayPageCards.css`（本 change 不改）。

## Goals / Non-Goals

**Goals:**

- Overview 視覺收斂到 Better 參考圖的精緻度（淺色），四面向：hero 張力、frosted glass 卡片、資料排版層次、滿版垂直節奏。
- 所有卡片質感改動限定在 Overview-scoped class，避免溢出其他四頁。
- 座標與顯示仍由既有 config/seed 表達，可由 editor 維護。

**Non-Goals:**

- 不改深淺色系、不改共用 card base、不碰 nav/route/server/SQLite/MQTT/region tree/publish。
- 不新增 widget 或資料來源。

## Decisions

1. **Frosted glass 只加在 Overview-scoped class**：在 `.overview-kpi-card`、`.overview-dashboard-widget`（含 `.overview-weather-widget`/`.overview-phase-power-widget`/`.overview-generation-trend-widget`）套半透明背景（rgba 白 0.62-0.74）、`backdrop-filter: blur(...)`、1px 細邊（rgba 綠 0.18 左右）、柔光 box-shadow、一致圓角（20-24px）。不改 `displayPageCards.css`。
2. **Hero 重排走既有 token/座標**：放大 hero 圖容器、調整 `heroCopyLayout` 與 hero typography（eyebrow/title/subtitle 字級行距），收掉中段留白。不改 hero media effect 機制。
3. **density widget 列下移避開 hero 圖**：把 density widget 列垂直座標調到 hero 圖底部之下、KPI 卡列之上的帶狀區，使三段（hero／widget 列／KPI 列）不重疊且節奏均勻。
4. **資料排版層次**：KPI 卡與三個 widget 內 value/unit/label 字級與間距精緻化（value 加大、unit/label 降階），透過 Overview-scoped css 與既有 card style config 達成。

## Implementation Contract

**Behavior（可觀察）:**
- `/overview` runtime（1920x1080）呈現：hero 圖佔據右側主視覺且與左側雙語標題形成清楚主從；三個 density widget 成一水平列、與 hero 圖與 KPI 卡列均無重疊；KPI 卡列在底部。
- KPI 卡與 density widget 皆為 frosted glass（半透明 + blur + 細邊 + 柔光），非扁平實心。
- 卡片內數據（value）為視覺焦點，unit/label 為次級層次。
- 整體內容鋪滿畫布，三段之間垂直間距均勻、無大片空白。

**Interface / 資料形狀:**
- 僅調整 `overview.css` 規則、`layout.ts` 與 `displayPageConfig.ts` 的座標數值（heroContainer/heroCopyLayout/dashboardWidgets/kpiCards），以及三個 widget component 內的 className/結構（不改 props 形狀）。
- 不新增 config key、不改 `OverviewDisplayPageConfig` 型別、不改共用 card component。

**Failure modes:**
- widget 缺資料時維持既有 fallback（天氣 fallback 文案、三相 `--`、趨勢空狀態），frosted glass 樣式在 fallback 態仍正確不破版。

**Acceptance criteria:**
- 既有 Overview 測試（layout.test.ts、style.test.ts、cardVisibility.test.ts、densityWidgets/densityViewModel/widget 測試）全綠。
- 若調整 layout 座標，更新對應 layout.test.ts 斷言並保持通過。
- 新增或更新 style 測試，斷言 Overview-scoped frosted glass 規則存在（backdrop-filter 或半透明背景）且只出現在 overview.css，不出現在共用 `displayPageCards.css`。
- 新增一條測試或斷言，驗證 density widget 列、hero 圖、KPI 卡列三段垂直區間不重疊（以座標計算）。
- `pnpm --filter @solar-display/web test` 與 `pnpm run build` 全綠。
- agent-browser 1920x1080 擷取 `/overview`，與 Better 對照確認四面向到位，witness 記入 change artifact。

**Scope boundaries:**
- In scope：Overview-scoped css、Overview layout/config 座標、三個 widget component 的 className/結構與排版、對應測試與 witness。
- Out of scope：共用 card base、其他四頁、nav/route/server/SQLite/MQTT、新 widget/資料源、深色主題。

## Risks / Trade-offs

- **backdrop-filter 效能**：多張 blur 卡片在低階展示機可能掉幀。取捨：blur 半徑保守（≤18px），卡片數量固定（5 KPI + 3 widget）。
- **座標重排影響既有 layout 測試**：需同步更新 layout.test.ts，避免假性失敗。
- **主觀視覺驗收**：以「三段不重疊 + frosted glass 規則存在 + witness 對照」三項可驗證條件錨定，降低 apply 漂移。
