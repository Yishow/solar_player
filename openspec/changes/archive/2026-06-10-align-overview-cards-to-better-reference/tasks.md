## 1. Baseline witness

- [x] 1.1 [P] 取現行 `/overview` live 截圖，逐卡（五張 KPI＋趨勢卡）對照 `docs/reference/Better/01.Overivew (大).png` 記錄差異與目標值。驗證：change artifact 內留下 witness 摘要與逐卡 pass/fail 與 seed 目標值清單。

## 2. Icon chip 卡內樣式能力

- [x] 2.1 [P] 滿足需求 Author Overview card icon chip style：在 `displayCardStyleConfig` card-style 設定新增 `iconChipBackground`（CSS 色）、`iconChipForeground`（glyph 色）與 `iconChipShape`（`circle` | `rounded-square`）欄位與 resolve 邏輯，缺漏/非法時回退 seed 預設。驗證：新增單元測試覆蓋預設與非法值回退並通過 `pnpm --filter @solar-display/web test`。
- [x] 2.2 `/display-pages/editor` Overview 卡內樣式 inspector 呈現 icon chip 底色、前景色與形狀控制，並經既有 draft/live 機制持久化。驗證：新增/更新 inspector 測試斷言欄位存在且可改，手動於 editor 改值存檔後 live 反映。

## 3. Icon chip runtime 與 CSS

- [x] 3.1 `buildDisplayCardStyleVars` 依設定輸出 `--display-card-icon-chip-bg`、`--display-card-icon-chip-fg` 與 `--display-card-icon-chip-radius`（circle→50%、rounded-square→token radius）。驗證：更新 `buildDisplayCardStyleVars` 測試斷言變數輸出值正確。
- [x] 3.2 `overview.css` 的 `.overview-kpi-icon-shell` / glyph 改吃上述變數、移除 `.overview-kpi-icon-accent` 寫死的 green/gold 硬色，icon chip 外觀完全由 runtime 變數驅動且維持 Overview-only 範圍。驗證：既有 overview style 測試不退化，live witness 確認 icon chip 依設定變色與變形。

## 4. 趨勢卡平滑曲線與說明

- [x] 4.1 [P] `Sparkline` 新增預設關閉的 `smooth` 選項，以平滑 path（Catmull-Rom/bezier）取代 angular 折線；未啟用時呼叫端渲染不變。驗證：新增測試覆蓋 smooth 開/關兩路徑，既有 `Sparkline` 呼叫端測試保持綠。
- [x] 4.2 滿足需求 Overview generation trend widget renders a full data-visualisation chart：`GenerationTrendWidget` 對齊 Better 樣稿，補上時間軸標籤、峰值 annotation、值軸刻度與格線的渲染入口；有 runtime series 顯示圖表、無 series 維持空狀態。驗證：新增/更新 widget 測試覆蓋有/無 series 分支與標籤渲染。

## 5. Server seed intraday 鐘形曲線

- [x] 5.1 [P] `apps/server/src/db/seed.ts` 以 idempotent 方式 seed 一組代表性 intraday `metric_snapshots`（24 點 generation：夜間低、午間峰、傍晚降，含 `captured_at`），使 `readOverviewGenerationTrendSeries` 讀出鐘形序列。驗證：新增 server 測試斷言 seed 後序列長度與形狀（上升至單一峰值再下降），`pnpm --filter @solar-display/server test` 全綠。

## 6. Seed 對映與視覺參數對齊

- [x] 6.1 `displayPageConfig` seed 對齊 Better：五卡 footerType/targetValue/footerText 對映、每卡 `iconChipBackground`/`iconChipShape` 預設、卡片視覺參數（shadow strength、corner radius、surface opacity、icon box size）。驗證：更新 seed/config 測試，並以 1.1 的目標值與 live witness 對照五卡內容物 ≥90% 相似。

## 7. 收尾驗證

- [x] 7.1 跑 `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/server test` 全綠且涵蓋本次新增/更新測試。驗證：指令輸出無失敗。
- [x] 7.2 滿足需求 Overview cards match the Better reference sample for icon chips and trend form：取 live `/overview` 收尾 witness 對照 Better 樣稿，確認五卡 icon chip 與趨勢卡曲線/標籤相符，將差異與例外記於本 change。驗證：change artifact 內留下收尾 witness 摘要。
- [x] 7.3 `spectra validate align-overview-cards-to-better-reference` 與 `spectra analyze` 無 Critical/Warning。驗證：指令輸出。

## 8. 趨勢卡質感重做與卡片提亮（Better closeout v2）

- [x] 8.1 滿足需求 Overview generation trend widget renders a full data-visualisation chart：在 `generationTrendChart` 新增純函式 `buildGenerationTrendYTicks`（nice max ≥ peak、≥2 刻度、位置 0..100）與 `mapGenerationTrendCoordinates`（值→y，佔滿繪圖高度）。驗證：新增 `.test.ts` 斷言 nice max ≥ peak、頂/底刻度位置、值 0/max 的 y 邊界。
- [x] 8.2 滿足需求 Overview generation trend widget renders a full data-visualisation chart：新建 `GenerationTrendChart` SVG 元件（填滿繪圖區、Y 軸刻度＋水平格線、層次漸層面積、平滑曲線、每點資料點、峰值標記、X 軸時間標籤），`GenerationTrendWidget` 改用之並保留空狀態。驗證：live witness 對照 Better 趨勢卡，圖表填滿且具軸線/格線/資料點。
- [x] 8.3 icon chip 提亮與每卡 glyph 分色：`displayCardStyleConfig` 新增 `iconChipForeground` 欄位與 resolve/輸出 `--display-card-icon-chip-fg`，`overview.css` 的 icon glyph 改吃 var；seed 五卡改用清楚 pastel 底＋對比 glyph。驗證：新增測試斷言 `iconChipForeground` resolve/fallback 與 CSS 變數輸出、seed 五卡分色，live witness 一眼可辨。
- [x] 8.4 KPI 卡質感微調：進度 `%` 更顯眼、卡片陰影/間距貼近 Better。驗證：live witness 對照 Better KPI 卡。
- [x] 8.5 收尾：`pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/server test` 全綠、取新 live witness 對照 Better、`spectra validate`/`analyze` 無 Critical/Warning。驗證：指令輸出與 witness 摘要。

## 9. 趨勢瞬時功率語意與 dev mock feed

- [x] 9.1 滿足需求 Overview generation trend reflects instantaneous generation power：新增 migration `013_generation_power.sql` 為 `metric_snapshots` 加 `generation_power REAL` 欄位。驗證：migrate 後欄位存在，server 測試套件可建表。
- [x] 9.2 滿足需求 Overview generation trend reflects instantaneous generation power：`SnapshotWriterService` 將 `snapshot.generationPower` 寫入 `metric_snapshots.generation_power`。驗證：更新 writer 測試斷言該欄位寫入值。
- [x] 9.3 滿足需求 Overview generation trend reflects instantaneous generation power：`readOverviewGenerationTrendSeries` 改讀最近 24 筆 `generation_power`，缺值時 fallback 既有 `generation`。驗證：server 測試覆蓋有/無瞬時功率歷史兩路徑。
- [x] 9.4 `db/seed.ts` 的 intraday 鐘形改寫入 `generation_power`（瞬時功率語意），`buildIntradayGenerationCurve` 命名/註解正名為瞬時功率。驗證：更新 `metricSnapshotsSeed.test.ts` 斷言 `generation_power` 鐘形。
- [x] 9.5 滿足需求 Development mock feed drives runtime metrics without bypassing the runtime path：新建 `MockMetricsFeedService`（純函式 `computeMockSolarPowerAt(date)` 鐘形＋定時 upsert `realTimePower` 等到 `live_metric_values`），`server-startup` 僅在 mock 模式啟動。驗證：新增 `.test.ts` 斷言鐘形函式（午峰/夜 0）與 upsert 行為；mock 模式啟動、非 mock 不啟動。
- [x] 9.6 收尾：`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 全綠；dev 跑一段時間後 `/overview` 趨勢卡呈鐘形且不被沖平的 witness；`spectra validate`/`analyze` 無 Critical/Warning。驗證：指令輸出與 witness 摘要。
