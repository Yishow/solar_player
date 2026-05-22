## Context

目前系統已經有 `display:sync` 與 runtime refresh registry，用於 `overview`、`solar`、`factory-circuit`、`images` 等資料刷新，但這套 wiring 沒有完整覆蓋以 persisted history 與 sustainability story 為主的頁面。`Sustainability` 只把 `display-pages` 視為 relevant scope，`Energy Trend` 與 `Energy History` 完全沒有接上 display-sync 或 socket refresh；同時 background services 也沒有在快照、每日摘要或永續資料來源更新後送出 runtime invalidation。這讓這三類頁面在長開情境下會逐步偏離最新資料。

## Goals / Non-Goals

**Goals:**

- 為 Sustainability、Energy Trend、Energy History 建立明確的 runtime refresh signal。
- 讓 background persistence / aggregate update 能推動前端資料重抓。
- 維持局部資料 refresh，不整頁 reload。

**Non-Goals:**

- 不更動既有指標計算公式。
- 不在這個 change 內新增新的歷史 API。
- 不讓所有頁面都無差別監聽所有 data-update 事件。

## Decisions

### Decision: Add dedicated display-sync scopes for sustainability and monitoring history

這個 change SHALL 新增可區分的 refresh scopes，例如 `sustainability` 與 `monitoring-history`，而不是把所有資料更新都塞進 `display-pages`。這樣前端可以精準判斷要刷新哪一類資料來源，也讓事件語意與實際資料域一致。

替代方案是重用 `display-pages` 或 `mqtt` scope。這會把 persisted-history 更新與 layout/config 更新混在一起，後續難以追蹤，因此不採用。

### Decision: Emit invalidation from the services that persist or derive the affected data

`SnapshotWriterService`、`DailySummaryService`、必要時 `MetricsAccumulatorService` 或 sustainability story source 更新點 SHALL 在資料真正更新後送出 invalidation，而不是由前端自行猜測何時需要 refresh。這可避免不必要的 fetch，也讓刷新依據貼近真實資料邊界。

替代方案是讓頁面固定秒數 polling。這無法表達資料真的有變動，且會造成多餘流量，因此不採用。

### Decision: Refresh page-local data loaders instead of full playback reload

這三類頁面主要依賴 fetch data 與本地 view model，因此在 relevant signal 到達時 SHALL 重新執行資料 loader，而不是透過 global playback reload coordinator 強制整頁 reload。這能保留 page-local UI state，例如當前 range / period。

替代方案是把新 scopes 也接進全域 playback reload。這對 history/sustainability 來說太粗，會重置 page-local selection，因此不採用。

## Implementation Contract

- Behavior:
  - 背景 metrics/history/sustainability 資料更新後，相關頁面在同一 session 內可自動重抓資料。
  - `Energy Trend`、`Energy History` 保留當前選擇的 range；`Sustainability` 保留當前 period，再以新的 server data 重建 view model。
  - 不相關的頁面不應因這些 signals 而無差別 reload。
- Interface / data shape:
  - shared `DisplaySyncEventScope` 需支援 sustainability 與 monitoring-history refresh domain。
  - runtime refresh registry 需明確列出各頁對應 scopes 與 refresh key。
- Failure modes:
  - refresh fetch 失敗時保留上一份可用資料，並以既有 error/helper state 提示同步失敗。
  - 若某次 background service 沒有產生新資料，不應送出誤導性的 refresh storm。
- Acceptance criteria:
  - server tests 覆蓋 relevant services 會送出對應 invalidation。
  - web tests 覆蓋三頁在 relevant signal 到達時會重抓資料且保留當前 range/period。
  - `spectra analyze`、`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 通過。
- Scope boundaries:
  - In scope: refresh scopes、service invalidation、page-local data reload。
  - Out of scope: view model redesign、new chart UX、polling-based fallback architecture。

## Risks / Trade-offs

- [Risk] service-level invalidation 送太頻繁，造成頁面重抓風暴。 → Mitigation: 只在資料真正落地或有新時間戳時送出 signal，必要時在前端 coalesce。
- [Risk] 新增 scopes 後，既有 playback reload coordinator 忽略它們造成 wiring 不一致。 → Mitigation: 明確區分哪些頁面走 page-local refresh，哪些頁面仍走 global playback reload，並在 registry/tests 中固定下來。
- [Risk] history range 保留 state 時，舊 request race 可能覆蓋新資料。 → Mitigation: loader 使用 active flag 或 request token，維持目前頁面已有的 race guard 模式。
