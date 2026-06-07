## Context

`Overview` 已有 `dashboardWidgets` 機制：`OverviewDashboardWidgetKey`（目前 `alertNotifications` | `generationTrend`）對應 `OverviewDashboardWidgetConfig`（`OverviewDisplayRect & { visible: boolean }`），由 seed config 設定絕對座標與顯示開關，並在 `DisplayPagesEditor/inspectorFields.tsx` 透過 `heightPath/leftPath/topPath/widthPath` 暴露 region 控制與 `visibleWhen` 開關。本 change 沿用此既有機制擴充，而非另造平行系統。

天氣資料已存在於 shared 的 `WeatherCurrentSnapshot`；三相電力可由 `LiveMetricsSnapshot.metrics`（`Record<string, LiveMetricReading>` 開放 key）承載，兩者皆復用既有資料管道。

## Goals / Non-Goals

**Goals:**

- 在 `Overview` 新增天氣卡、三相電力表，並把 `generationTrend` 升級為填色 area 趨勢圖。
- 三個 widget 皆由既有 `dashboardWidgets` 機制持久化（seed → draft → live → publish 共用同一 config），並可由 editor 調整 region 與顯示開關。
- 缺資料時三個 widget 各自走 seed fallback，不破版、不顯示空值殘影。
- Overview hero 字級節奏與 KPI 卡 surface/icon/間距朝 Better 密度收斂。

**Non-Goals:**

- 不新增 server route、DB migration、MQTT 設定；不新增資料源。
- 不改 nav/route、FHD 畫布縮放模型、region tree、publish workflow。
- 不為三相電力表加 inspector 端的「逐欄綁定 metric key」UI（本輪以固定 R/S/T×V/A/kW 對應既有 metric key 慣例，缺 key 即 fallback）。
- 不動其餘四個 playback 頁。

## Decisions

1. **沿用 `dashboardWidgets` 擴充**：`OverviewDashboardWidgetKey` 加入 `weather`、`phasePower`。新增 widget 與既有 `alertNotifications`/`generationTrend` 共用 config 形狀、seed merge 邏輯與 inspector path 對映，確保 editor-maintainable 與 fallback 行為一致。
2. **天氣綁既有 contract**：天氣卡讀 `WeatherCurrentSnapshot`（透過 Overview viewModel 既有 story/weather 注入路徑取得），不直接打新 API。`fetchState` 非 `fresh` 或欄位為 null 時顯示 fallback 文案。
3. **三相電力走既有 metric channel**：以固定 key 慣例讀取 `snapshot.metrics`（`phaseRVoltage`/`phaseRCurrent`/`phaseRPower`，S、T 同理）。任一 phase 全缺時，該列顯示 seed fallback 佔位值，不顯示 NaN。
4. **趨勢圖升級就地進行**：`GenerationTrendWidget` 由 `Sparkline` 改為填色 area 視覺（沿用 viewModel `trendSeries`），不改 widget 的 config key 與 region path。
5. **預設顯示策略**：seed config 將 `weather`、`phasePower`、`generationTrend` 預設 `visible: true` 以呈現 Better 密度；`alertNotifications` 維持既有預設。座標依 Better 的「第二排 + 趨勢列」節奏配置。

## Implementation Contract

**Behavior（使用者可觀察）:**
- 開啟 `/overview`（無 config，走 runtime hydration）時，預設可見：hero、5 張 KPI 卡、天氣卡、三相電力表、填色面積趨勢圖。
- 天氣卡顯示天氣描述、氣溫、濕度、觀測時間；資料不可用時顯示明確 fallback 文案而非空白或 null。
- 三相電力表顯示 R/S/T 三列，每列含 V/A/kW 三欄；對應 metric 不可用時該欄顯示 seed fallback 佔位，不出現 NaN/undefined。
- 趨勢圖以填色面積呈現，無資料時顯示既有「尚無發電趨勢資料」fallback。
- 於 `/display-pages/editor` 可調整三個 widget 的 region（left/top/width/height）與顯示開關，存草稿並 publish 後 `/overview` runtime 呈現相同設定。

**Interface / data shape:**
- `OverviewDashboardWidgetKey` 擴充為 `"alertNotifications" | "generationTrend" | "weather" | "phasePower"`。
- 新增 view model 輸出：`viewModel.weather`（由 `WeatherCurrentSnapshot` 投影出 display-ready 欄位與 availability 旗標）與 `viewModel.phasePower`（R/S/T 三列，各含 voltage/current/power 值與 availability 旗標）。
- 新元件 `WeatherCardWidget`、`PhasePowerTableWidget`，props 形狀對齊既有 widget（接 view model 投影 + `style`）。
- seed config（`createOverviewDisplayPageSeedConfig`）為兩個新 key 提供 `OverviewDashboardWidgetConfig` 預設（座標 + `visible: true`）。
- inspector field 為兩個新 key 提供 region path 與 `visibleWhen` 開關，沿用既有 `heightPath/leftPath/topPath/widthPath` 結構。

**Failure modes:**
- 缺欄位/缺 metric key/`fetchState` 非 fresh → 對應 widget 或欄位顯示 seed fallback，靜默回退（不丟錯、不顯示 null/NaN）。
- config 缺 widget key → `resolveOverviewModernDefaultConfig` 既有 merge 邏輯回退 seed baseline。

**Acceptance criteria:**
- `apps/web/src/pages/Overview/displayPageConfig.ts` 對應測試涵蓋新 key 的 seed 預設與 config merge fallback。
- 新增 `WeatherCardWidget` / `PhasePowerTableWidget` 與升級後趨勢圖各有 `*.test.tsx`，涵蓋有資料與 fallback 兩種狀態。
- viewModel 測試涵蓋 weather/phasePower 投影與 availability 旗標。
- inspector 測試涵蓋兩個新 widget 的 region/visibility field。
- `pnpm --filter @solar-display/web test` 與 `pnpm run build` 全綠。
- agent-browser 於 1920x1080 擷取 `/overview`，witness 顯示三個 widget 成形且密度朝 Better 收斂。

**Scope boundaries:**
- In scope：Overview widget config schema、view model 投影、三元件、seed/inspector/fallback、hero/KPI polish、targeted tests。
- Out of scope：server/DB/MQTT、其餘四頁、nav/route、publish workflow、逐欄 metric 綁定 UI。

## Risks / Trade-offs

- **三相 metric key 為慣例而非設定**：若實際 MQTT topic 命名不同，三相表會持續走 fallback。取捨：本輪先以固定慣例 + fallback 上線密度與視覺，逐欄綁定 UI 留待後續 change。
- **預設顯示增加密度**：新 widget 預設 `visible: true` 可能與既有極簡部署期待不同；以 editor 可關閉緩解。
- **就地升級趨勢圖**：改 `GenerationTrendWidget` 內部視覺需確保既有 region path/key 不變，避免影響既有 config/test。
