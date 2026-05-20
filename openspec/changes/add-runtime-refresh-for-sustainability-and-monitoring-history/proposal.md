## Summary

補上 Sustainability、Energy Trend 與 Energy History 的 runtime refresh wiring，讓背景累積/快照/摘要更新之後，前端頁面能自動反映最新資料，而不是只在 mount 或切換 range 時才重新抓取。

## Motivation

目前 `Energy Trend`、`Energy History` 與 `Sustainability` 都把資料載入綁在初次 render 或使用者切換 period/range。server 端的 `MetricsAccumulatorService`、`SnapshotWriterService` 與 `DailySummaryService` 雖會持續更新 DB 與 aggregate state，卻沒有向 runtime 發出對應 refresh signal；前端 refresh registry 也沒有把這些頁面資料來源完整納入 relevant scopes。結果是頁面在長時間開著時會逐漸 stale，尤其在 kiosk 或管理監控牆上更明顯。

## Proposed Solution

- 為 sustainability 與 monitoring history 建立可被 runtime 消費的 refresh scope，並讓背景 service 在資料落地或 story state 更新時送出一致 invalidation。
- 擴充前端 refresh registry / hooks，讓 `Sustainability`、`Energy Trend`、`Energy History` 在 relevant signal 到達時重抓對應資料，而不是依賴人工切 tab 才更新。
- 保持 reload 粒度針對資料來源，而不是整頁重新整理。

## Non-Goals

- 不在這個 change 內重算永續 story 或歷史 view model 的業務邏輯。
- 不改 `Energy Trend` / `Energy History` / `Sustainability` 的主要版型。
- 不引入新的 polling daemon 或 browser interval 輪詢作為主要同步手段。

## Alternatives Considered

- 只靠固定前端 polling：容易實作，但會把原本 event-driven 的 runtime 模型退化成持續輪詢，且不能精準表達哪一類資料已更新。
- 直接把所有更新都映射到既有 `display-pages` scope：可以少改 shared type，但會讓 refresh 原因過於模糊，也難以控制不同頁面的重抓邏輯。

## Impact

- Affected specs:
  - sustainability-runtime-refresh
  - monitoring-history-runtime-refresh
- Affected code:
  - Modified:
    - packages/shared/src/displayOps.ts
    - apps/server/src/realtime/SocketService.ts
    - apps/server/src/services/MetricsAccumulatorService.ts
    - apps/server/src/services/SnapshotWriterService.ts
    - apps/server/src/services/DailySummaryService.ts
    - apps/server/src/services/sustainabilityStoryService.ts
    - apps/web/src/pages/runtimeRefreshRegistry.ts
    - apps/web/src/hooks/displaySyncPlaybackReload.ts
    - apps/web/src/pages/EnergyTrend/index.tsx
    - apps/web/src/pages/EnergyHistory/index.tsx
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - New:
    - apps/web/src/hooks/useRuntimeDataRefresh.ts
  - Removed: (none)
