# Closeout witness — /overview（task 7.2）

- 擷取：`http://localhost:4173/overview`，viewport 1920×1080（另存 2x retina）。
- 截圖：`witness/overview-after.png`、`witness/overview-after-2x.png`（對照 baseline `witness/overview-baseline.png`）。
- 對照樣稿：`docs/reference/Better/01.Overivew (大).png`。

## 逐項結果

| 項目 | baseline | closeout | 判定 |
|---|---|---|---|
| KPI icon chip | 小圓形綠色線框、單色 | 五卡各自彩色圓角方形 chip（radius 30%） | PASS |
| icon chip 來源 | 寫死 green/gold accent | runtime CSS var `--display-card-icon-chip-bg/-radius` | PASS |
| 趨勢卡曲線 | angular 折線、近定值雜訊 | 平滑鐘形填色曲線（smooth path） | PASS |
| 趨勢卡說明 | 僅兩端點數值 | 時間軸標籤（00:00–24:00）＋峰值 annotation | PASS |
| footer 內容物 | sparkline/progress/text/co2-tree | 同上，對位 Better 五卡 | PASS（≥90%） |

## icon chip 計算樣式（live 驗證）

`getComputedStyle('.overview-kpi-icon-shell')` 五卡：

- power → `rgba(94, 135, 71, 0.2)`，radius 30%
- today → `rgba(214, 158, 46, 0.22)`，radius 30%
- total → `rgba(56, 132, 156, 0.2)`，radius 30%
- co2Today → `rgba(76, 156, 122, 0.2)`，radius 30%
- co2Total → `rgba(201, 120, 58, 0.22)`，radius 30%

全部由 runtime 變數驅動、每卡分色、圓角方形，符合 spec `overview-card-internal-style-authoring`。

## 趨勢卡鐘形資料來源說明

- 正式機制：`apps/server/src/db/seed.ts` 的 `buildIntradayGenerationCurve()` 在 `metric_snapshots` 為空時 seed 24 點日照鐘形；fresh DB 部署即呈現鐘形。由 server 測試 `metricSnapshotsSeed.test.ts` 驗證（長度 24、單峰、idempotent）。
- 本次 witness：現有 dev DB 已有 runtime snapshots（writer 持續寫平值），故 seed 不會插入。為取得 live 鐘形截圖，暫時把 24 點鐘形（過去 24 小時、ISO 時間）注入 running dev DB；趨勢卡 last-24 即呈現鐘形。
- dev DB 原 `metric_snapshots`（17804 筆）已備份於 `/tmp/solar-bell-backup.sqlite*`，可還原。

## v2 質感重做（趨勢卡圖表 + chip 提亮）

回應「曲線圖差太多、一點質感都沒有」：

- 趨勢卡由迷你 `Sparkline` 換成專用 `GenerationTrendChart`（SVG＋HTML overlay）。live DOM 驗證：3 條 Y 軸刻度（5k/2.5k/0，niceMax 隨資料）＋3 條水平格線、24 個資料點、1 個峰值標記、X 軸時間標籤；plot 約 133px 高、填滿卡片。
- icon chip 由 `rgba(…,0.2)` 淡tint 改為清楚 pastel 底＋每卡對比 glyph 色（新增 `iconChipForeground`／`--display-card-icon-chip-fg`）：power 綠、today 琥珀、total 藍、co2Today 青、co2Total 橘，一眼可辨。
- KPI 卡 `surfaceOpacity` 0.66→0.8（更清晰）、進度 `%` 字級 16→20。
- server seed 曲線拉寬（日照 5–20 時）讓鐘形更飽滿。
- 截圖：`witness/overview-after-v2.png`（對照 `overview-baseline.png`／`overview-after.png`）。

## v3 修正趨勢卡填色錯位 bug

回應「還是不行」：近照發現 v2 趨勢卡有 bug — 填色面積曲線被壓在左側 00:00–06:00，與資料點不對齊。

- 根因：`<svg>` 是 replaced element 有 1:1 intrinsic aspect ratio，`width:auto; height:100%` 把寬度鎖成 133px 正方形（忽略 `right:0`），viewBox x 0–100 被壓在左邊 133px。
- 修法：svg＋points 包進以 inset 定尺寸的 `.overview-trend-canvas`，svg 改 `width/height:100%` 填滿。live 驗證 svg 由 133×133 → 633×133。
- 加強：漸層更飽和（top 0.5）、線寬 2.5→3、資料點縮小淡化。
- 結果：填滿卡片、平滑鐘形、Y軸(5k/2.5k/0)＋格線、X軸時間、峰值「4,177 kW」全對齊。
- 截圖：`witness/trend-card-fixed.png`、`witness/overview-after-v3.png`。

## 保護屬性 / 例外

- footer 種類未新增；只在資料限制下沿用既有對映（僅 `realTimePower` 有 trendSeries，故僅 power 卡用 sparkline）。
- shell 頂列與底部導覽（`AppHeader`/`AppFooterNav`）與五頁 IA 未更動。
- 卡片視覺參數（shadow/opacity/blur）維持既有 frosted-glass，未為對齊 Better 推翻 `overview-fhd-better-quality` 的 frosted-glass 要求。

## Section 9：瞬時功率語意、dev mock feed 與 daily-profile reader（task 9.1–9.6）

### 做了什麼

- `generation_power` 全鏈：migration `013_generation_power.sql` 加欄、`SnapshotWriterService` 寫入 `snapshot.generationPower`、`readOverviewGenerationTrendSeries` 優先讀 `generation_power`（缺值 fallback `generation`）、seed `buildIntradayGenerationCurve` 註解正名為瞬時功率（kW）並寫入 `generation_power`。
- `MockMetricsFeedService`：純函式 `computeMockSolarPowerAt(date)`（日照鐘形、午峰 ~4200kW、夜 0）＋定時 upsert `realTimePower` 到 `live_metric_values`；`server-startup` 僅在 `data_mode === "mock"` 啟動。讓 mock 模式下既有 accumulator → snapshot-writer pipeline 用 runtime 資料產生趨勢，不在 widget mock。
- **Daily-profile reader（依使用者決定擴充 9.3/9.6 scope）**：原 reader 取「最近 24 筆 rows」，配 60s snapshot 寫入會在 ~24 分鐘內把趨勢沖平成近水平。改為 `selectHourlyGenerationTrendSeries`：每「日期-小時」桶取最新一筆、取最近 24 桶、chronological，並沿用 `selectGenerationTrendSeries` 的 power/generation 值偏好。SQL 改抓最近 2000 筆（≈ 60s 節奏一天多），由純函式收斂成 ≤24 個日輪廓點；不用 wall-clock 過濾以保持 deterministic、不在跨日掉點。

### 測試（驗收）

- `pnpm --filter @solar-display/server test`：**254 pass / 0 fail**（含 `MockMetricsFeedService.test.ts` 的鐘形＋upsert、`generationTrendSeries.test.ts` 新增 hourly bucketing 5 例、既有 `routes/display-story.test.ts` HTTP trend 原樣通過）。
- `pnpm --filter @solar-display/web test`：**609 pass / 0 fail**。
- `spectra validate`：valid；`spectra analyze`：無 Critical/Warning（11 Suggestion）。
- mock 啟動/非 mock 不啟動的 gating 測試在 `server-startup.test.ts`，直接跑 `tsx --test --test-force-exit src/server-startup.test.ts` **5 pass**。

### Live witness（mock 全棧、temp DB、截完拆掉）

- 另起 server：`PORT=3100 DATA_DIR=/tmp/solar-witness DATABASE_PATH=… UPLOADS_DIR=… MQTT_DATA_MODE=mock tsx src/server.ts`（fresh temp DB → migrate+seed 得鐘形；server 自帶 `apps/web/dist`，重建後含目前 overview chart）。截完已停 server、清 temp dir，未動 `:3000`/`:4173` 與 dev 資料。
- API 驗證 `GET /api/display-story` 的 `realTimePower.trendSeries`：`[0,0,0,0,0,0,873,1708,2469,3121,3637,3994,4177,4177,3994,3637,3121,2469,1708,873,0,0,0,0]` —— 24 點、夜 0、午峰 4177、單峰升降，daily profile 端到端成立。
- 截圖：`witness/overview-daily-profile-mock.png`（1920×1080）。趨勢卡呈綠色填色鐘形曲線＋峰值標註「4,177 kW」。
- 截圖當下 wall-clock 21:08（日落 20:00 後），`REAL TIME POWER` 卡顯示 `0.0 kW`（正確：夜間瞬時功率為 0），而趨勢卡仍保留整日鐘形 —— 這正是 daily-profile reader 要的：**當下功率歸零、日輪廓不塌**，驗證「呈鐘形且不被沖平」。

### 保護屬性 / 例外

- 趨勢資料形狀維持 `number[]`，`GenerationTrendChart` 元件未改（v3 已 witness 過其鐘形＋軸線＋資料點渲染）；本次只改 server 端資料語意與 reader 窗。
- reader 窗用 row-limit（2000）而非 wall-clock：deterministic、跨日不掉點；代價是窗大小與 snapshot 節奏耦合（60s 預設下覆蓋 >24h，足以填滿 24 桶）。
- mock feed 預設不啟動（`data_mode` 預設 `mqtt`），production 真實 broker 不受影響；timer `unref`、upsert idempotent、功率恆為有限非負值。

### 範圍外發現（建議另開 change，未在本次處理）

- `apps/server/package.json` 的 `test` glob `src/**/*.test.ts` 在 `pnpm test`（sh）下**不含頂層 `src/*.test.ts`**（`server-startup`、`config`、`env`、`logger`、`serverRuntimeGuard` 五檔），故這些測試不被 `pnpm test` 收錄。屬既有狀況，與本 change 無關；本次 gating 測試已用直接跑驗證通過。

## Section 9 後續修正：真實太陽能曲線形狀 + 時區分桶 bug

回應「雖然是鐘形，但不符合正常太陽能曲線」：

### 曲線重塑（依使用者選定形狀）

- 原本 seed 與 mock feed 各自用「5:00–20:00 對稱半正弦」。改為共享模組 `apps/server/src/metrics/solarGenerationProfile.ts` 的 `SOLAR_GENERATION_PROFILE_KW`（24 點本地小時 kW）：晨起陡升、早午後單峰（13:00 = 4200kW）、傍晚緩降長尾。`buildIntradayGenerationCurve`（seed）與 `computeMockSolarPowerAt`（mock feed，內插）都委派此 profile，兩路徑一致、不漂移。
- 新增 `solarGenerationProfile.test.ts`（4 例：24 點、峰在 13、夜間 0、晨陡午緩的非對稱、內插）；既有 seed/mock 測試在新形狀下仍綠。

### 渲染缺口 bug（時區分桶）

- 近照趨勢卡時發現峰值處有一道往下到基線的尖銳缺口（雙峰火山口）。抽 DOM path 確認 index 13（峰值）被畫到 y≈94（基線）。
- **根因（時區）**：seed 用本地時間字串寫 `captured_at`（hour 13 = 本地 13:00），snapshot writer 用 `toISOString()` 寫 **UTC**。本地 21:4x = UTC 13:4x，mock feed 的夜間值（~40）以 `…T13:43Z` 寫入；原 `selectHourlyGenerationTrendSeries` 用字串切片把它歸到「hour 13」並判定「較新」→ 覆蓋掉 seed 正午的 4200。
- **修法**：分桶改用 `new Date(captured_at.replace(" ","T"))` 解析、依**本地小時**（`getHours()`）分桶並以 `getTime()` 比較最新。seed 本地字串解析為本地、runtime 的 UTC-Z 解析後 `getHours()` 也回本地小時，兩者對齊。新增時區一致性測試（同一時刻的 UTC 與本地寫法歸同一本地小時桶）。

### 修復後 witness（mock 全棧、temp DB、截完拆掉）

- 等一個 snapshot-writer 週期（60s）讓 runtime 真的寫入後，API series：`[…,4180,4200(idx13),4090,…,1450,25(idx21),0,0]` —— **峰值仍在 index 13 = 4200**（未被覆蓋），runtime 正確落到本地 hour 21（idx21 由 150→25，當下夜間值）。
- DOM path 峰值區 y≈19–20（頂端、平滑），無 y≈94 下墜。
- 截圖：`witness/overview-trend-card-realistic.png`（趨勢卡近照，乾淨單峰非對稱鐘形＋峰值 4,200 kW）、`witness/overview-daily-profile-mock.png`（全頁 1920×1080）。
- `pnpm --filter @solar-display/server test`：**258 pass / 0 fail**（含 4 個新 profile 測試與更新後的時區分桶測試）。
