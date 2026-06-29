## Context

`MQTT Settings`、Overview 趨勢與 `/settings/data-source` 目前分散在不同 server / web 模組，但問題其實是同一條營運資料鏈上的收尾缺口：

- `PUT /api/settings/mqtt` 目前的 operator 心智模型是「按下 save 就應該先存起來」，但 broker reconnect 例外會讓 UI 以為整次 save 失敗。
- 同主機本機瀏覽器對 management read API 不一定會送 `Origin`，只靠 `Origin` 會誤擋合法讀取。
- Overview 趨勢目前採「資料裡最後一天」語意，不是「現在這一天」語意，跨日後會繼續沿用昨天曲線。
- 當系統時間錯誤時，現場缺少看得見的診斷，也沒有安全清除「今天曲線」污染點的入口。

這次 change 橫跨 server route、trend selector 與 management page，但不引入新資料表，也不改既有 playback story / MQTT ingest 主架構。

## Goals / Non-Goals

**Goals:**

- 讓 MQTT / weather 設定的持久化結果不被 broker reconnect 成敗掩蓋。
- 讓同主機瀏覽器對 read-only management API 的合法 GET 不再被誤拒。
- 讓 Overview trend 嚴格反映「目前本地日」，跨日但尚無新 snapshot 時回傳空 trend。
- 提供可見的 snapshot 時間異常提示與「只清今日曲線」的維運操作。

**Non-Goals:**

- 不新增 raw MQTT payload 歷史儲存。
- 不自動修正 NTP / RTC / 系統時間。
- 不清除 `live_metric_values`、`daily_energy_summaries`、`cumulative_counters`。
- 不把 data-source 頁擴成通用資料治理主控台。

## Decisions

### Persist MQTT settings before reconnect attempts

先寫 DB，再以 fire-and-forget 方式觸發 `mqttClientService.connect()`。理由是這個 API 的主要契約是「設定已存下來」，不是「broker 現在一定可連」。如果 reconnect 失敗，runtime status 與 diagnostics 仍會反映 broker 異常，但 operator 重新整理後必須看得到剛剛儲存的值。

替代方案是回傳部分成功或雙階段 save，但這會把原本單一 save 動作變複雜，也無法改善「看起來像沒存」的核心問題。

### Treat same-host referer as trusted only for read-only management requests

trusted read 判定新增「無 `Origin` 但 `Referer` host 與當前 request host 同源」的窄例外，只用在 `isTrustedManagementReadRequest()`。mutation 路徑仍維持原本更嚴格的 trusted write 條件，避免把瀏覽器便利性擴大成寫入風險。

替代方案是全面放寬無 `Origin` 請求，但那會模糊 read / write 邊界。

### Treat Overview trend as a current-day-only profile

`selectHourlyGenerationTrendProfile` 增加可注入的 `now`，將資料視窗鎖在 `now` 的本地 calendar day。若該日沒有任何可用 snapshot，直接回傳空 `hours/series`。display story 只沿用這個空結果，由既有 widget / KPI empty-state 處理，不額外在 page 層造新 fallback。

替代方案是繼續採最新有資料的一天，再由前端比對日期隱藏，但那會把時間語意分散到多層，且容易讓其他 consumer 再次誤用舊曲線。

### Surface reset and anomaly diagnostics from the data-source operations page

reset 與時間異常提示放在 `/settings/data-source`，因為這頁本來就承接 runtime SQLite / retention / MQTT / weather 的維運脈絡。API 只做兩件事：

- 回傳最新 snapshot 日期、與目前本地日是否一致、以及簡單時間異常提示。
- 執行「刪除今日 `metric_snapshots`」並送出 `monitoring-history` refresh。

這比把按鈕塞進 Overview 或 MQTT 頁更容易被現場理解，也不會污染 playback surface。

## Implementation Contract

- Behavior:
  - `PUT /api/settings/mqtt` 儲存成功後，即使 broker reconnect 失敗，後續 `GET` 仍會回傳剛儲存的 broker / weather 設定。
  - read-only management API 在缺少 `Origin` 但 `Referer` 與當前 host 同源時可被 trusted browser 正常讀取；非同源或 write API 不因此放寬。
  - Overview trend 只在「目前本地日」有 snapshot 時提供資料；跨日且尚未寫入新 snapshot 時，trend 為空。
  - `/api/data-source/overview` 額外提供 snapshot 日期診斷與時間異常訊息；`POST /api/data-source/reset-today-trend` 只清當日 `metric_snapshots` 並觸發 `display:sync` 的 `monitoring-history` refresh。
- Interface / data shape:
  - Data source overview response 新增 monitoring diagnostics 區塊，至少包含目前本地日期、最新 snapshot 日期、是否有今日 snapshot、以及 zero-or-more anomaly messages。
  - reset API 回傳刪除筆數、重設日期與執行時間；錯誤仍沿用既有 Fastify error handler。
  - `selectHourlyGenerationTrendProfile(rows, options?)` 接受可選 `now` 以判定 current day。
- Failure modes:
  - broker reconnect 失敗對 save API 為靜默背景失敗；broker 狀態由既有 diagnostics 顯示。
  - 若今日無 snapshot，trend 回傳空陣列，不回退到昨天。
  - reset API 若無今日資料，回傳刪除 0 筆而非錯誤。
- Acceptance criteria:
  - `apps/server/src/routes/settings-mqtt.test.ts`
  - `apps/server/src/plugins/managementAuth.test.ts`
  - `apps/server/src/routes/data-source.test.ts`
  - `apps/server/src/services/generationTrendSeries.test.ts`
  - `apps/web/src/pages/DataSourceSettings/viewModel.test.ts`
  - `pnpm --filter @solar-display/server test`
  - `pnpm --filter @solar-display/web test`
- Scope boundaries:
  - 只處理 A-E；raw MQTT history、NTP 修正、自動清理非今日摘要/累積資料都不在本 change。

## Risks / Trade-offs

- [Background reconnect failure becomes silent at save time] → 仍保留 runtime status / diagnostics，並讓已存設定可重新載入驗證。
- [Current-day-only trend may look empty right過 midnight] → 這是刻意行為，避免昨天曲線偽裝成今天；現場若要清掉污染資料可用 reset。
- [Simple anomaly heuristics may不涵蓋所有時間錯誤] → 先提供低風險、可理解的提示，不在此 change 追求完整時間取證。
