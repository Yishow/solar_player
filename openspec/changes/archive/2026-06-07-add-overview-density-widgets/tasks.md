## 1. Shared config schema 擴充（先行，解除平行任務的相依）

- [x] 1.1 在 `apps/web/src/pages/Overview/displayPageConfig.ts` 將 `OverviewDashboardWidgetKey` 擴充為 `"alertNotifications" | "generationTrend" | "weather" | "phasePower"`，並為兩個新 key 在 `createOverviewDisplayPageSeedConfig` 提供 `OverviewDashboardWidgetConfig` 預設（依 Better 第二排節奏的絕對座標 + `visible: true`），同時確認 `resolveOverviewModernDefaultConfig` 的 merge fallback 涵蓋新 key。
- [x] 1.2 在 `apps/web/src/pages/Overview/displayPageConfig.ts`（或其對應測試檔）補測試：驗證新 key 的 seed 預設存在、可見，且缺 key 時 config merge 回退 seed baseline。

## 2. View model 投影

- [x] 2.1 在 `apps/web/src/pages/Overview/viewModel.ts` 新增 `weather` 投影（由 `WeatherCurrentSnapshot` 取天氣描述/氣溫/濕度/觀測時間 + availability 旗標）與 `phasePower` 投影（R/S/T 三列，各含 voltage/current/power 值，讀既有 `LiveMetricsSnapshot.metrics` 慣例 key，含 availability 旗標）。
- [x] 2.2 在 `apps/web/src/pages/Overview/viewModel.test.ts` 補測試：涵蓋天氣有資料/不可用、三相 metric 齊全/缺漏的 availability 旗標與 fallback 值。

## 3. 天氣卡 widget（可平行）

- [x] [P] 3.1 新增 `apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx`，沿用既有 widget props 形狀（接 view model `weather` 投影 + `style`），用 `DisplayCardFrame/Header` family 呈現；不可用時顯示明確 fallback 文案。
- [x] [P] 3.2 新增 `WeatherCardWidget` 測試（有資料顯示值、不可用顯示 fallback 不顯示 null）。

## 4. 三相電力表 widget（可平行）

- [x] [P] 4.1 新增 `apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx`，呈現 R/S/T × V/A/kW；缺欄位顯示 seed fallback 佔位，不出現 NaN/undefined。
- [x] [P] 4.2 新增 `PhasePowerTableWidget` 測試（metric 齊全顯示值、缺漏顯示 fallback 佔位）。

## 5. 趨勢圖升級（可平行）

- [x] [P] 5.1 在 `apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx` 將視覺由 `Sparkline` 改為填色面積 area 趨勢，沿用 viewModel `trendSeries` 與既有 widget config key/region path；無資料時維持既有 fallback 文案。
- [x] [P] 5.2 更新/新增 `GenerationTrendWidget` 測試，涵蓋填色 area 有資料與無資料 fallback。

## 6. Runtime 接線與 hero/KPI polish

- [x] 6.1 在 `apps/web/src/pages/Overview/index.tsx` 依 `shouldRenderOverviewDashboardWidget` 與各 widget 的 `withContentOffset` layout 接入 `WeatherCardWidget` 與 `PhasePowerTableWidget`，並把 view model `weather`/`phasePower` 投影傳入。
- [x] 6.2 在 `apps/web/src/pages/Overview/overview.css`（與必要的 `layout.ts` 座標）調整 hero 字級節奏與 KPI 卡 surface/icon/間距，朝 `docs/reference/Better/01.Overivew (大).png` 密度與節奏收斂；不改 region tree 與畫布縮放模型。

## 7. Editor inspector 控制

- [x] 7.1 在 `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx` 為 `weather`、`phasePower` 兩個新 widget key 補 region 控制（沿用 `heightPath/leftPath/topPath/widthPath` 結構）與 `visibleWhen` 顯示開關。
- [x] 7.2 補/更新 inspector 對應測試，驗證兩個新 widget 的 region 與 visibility field 存在且綁正確 path。

## 8. 驗證與 witness

- [x] 8.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm run build`，全綠。
- [x] 8.2 以 agent-browser 在 1920x1080 擷取 `/overview`，對照 `docs/reference/Better/01.Overivew (大).png` 確認三個 widget 成形且密度/節奏收斂，將 witness 與例外記於本 change artifact。

## 9. Requirement 驗收對映

- [x] 9.1 驗收 "Render editor-maintainable Overview density widgets"：seed 預設可見、editor region/visibility draft→publish→runtime 一致（任務 1、6、7、8）。
- [x] 9.2 驗收 "Bind weather card to the existing weather contract"：天氣卡讀既有 weather snapshot、不可用顯示 fallback（任務 2、3）。
- [x] 9.3 驗收 "Render three-phase power from existing metric channel with fallback"：三相表讀既有 metric channel、缺欄位顯示 fallback 佔位（任務 2、4）。
- [x] 9.4 驗收 "Preserve Overview architecture and scope boundaries"：未改 nav/route/server API/SQLite/MQTT，且無 page-local hardcode 繞過 editor（任務 6、7、8）。
