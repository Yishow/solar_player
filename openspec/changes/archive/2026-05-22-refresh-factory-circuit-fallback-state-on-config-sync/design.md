## Context

`Factory Circuit` 頁面同時依賴兩條 runtime source：`display-story` 提供優先使用的 story payload，`/api/circuits` 則在 story payload slot coverage 不足時作為 fallback rows 的來源。現況中 `useDisplayStoryRuntime("factory-circuit")` 已接上 `display:sync` invalidation，但 circuits source 仍是頁面內單次 `useEffect` bootstrap，導致 slot assignment、enabled 狀態或 live page config 已經變更時，fallback rows 仍可能沿用舊的 circuits snapshot。

這個 change 的限制是不能把 `display-story` API、`Factory Circuit` 版面或 `Circuit Settings` 管理流程一起重寫；它只處理「當 `Factory Circuit` 正在用 circuits fallback 時，這份 fallback source 如何跟著同步事件刷新」。

## Goals / Non-Goals

**Goals:**

- 讓 `Factory Circuit` 在收到相關 `display:sync` 事件後，能重新載入最新 circuits source，避免 fallback rows 卡在初次 mount 的舊資料。
- 保持 `display-story` 與 circuits fallback 的責任分離，避免為了 page-local refresh 問題去擴大 server API 或共享 hook scope。
- 定義 refresh failure 時的穩定行為，避免同步期間短暫失敗就把既有 fallback rows 清空。

**Non-Goals:**

- 不拆分或重構 `apps/server/src/routes/display-story.ts`、`apps/server/src/services/displayStoryService.ts`。
- 不調整 `Factory Circuit` 的 layout、文案、icon 對位或 slot-binding requirement 本身。
- 不順手重構 `Circuit Settings`、readiness、或其他 monitoring pages 的 reload 流程。

## Decisions

### Reuse display sync invalidation for fallback circuits reload

`Factory Circuit` 的 fallback circuits source SHALL 跟隨既有 `display:sync` 事件，而不是引入新的輪詢或專用 socket event。實作上會沿用目前 runtime refresh registry 已經定義的 `circuits` / `display-pages` invalidation contract，讓 page 在相關同步後重抓 circuits source。這樣可以保持管理頁與 playback/runtime 對同一套同步語意的理解一致。

替代方案是只保留初次 mount 抓取，再要求使用者重整頁面。這無法滿足 runtime/published config 已更新但 fallback rows 仍舊 stale 的問題，因此排除。

### Keep circuits fallback reload page-local instead of extending useDisplayStoryRuntime

circuits source reload SHALL 侷限在 `Factory Circuit` 頁面自己的 runtime lifecycle，而不是把 `/api/circuits` 混入 `useDisplayStoryRuntime` 或要求 `display-story` 回傳更多 fallback 資料。`display-story` 仍然只負責 story payload；當 payload coverage 不足時，由頁面組合最新 circuits snapshot 進 `buildFactoryCircuitViewModel`。

替代方案是把 circuits fallback 一起搬進 `displayStoryService`。那會把本來獨立的 change 擴大成 server contract 重構，並與後續 page-scoped story endpoint 工作重疊，因此這輪不做。

### Preserve last settled fallback rows across refresh failures

sync-triggered circuits refresh 若失敗，頁面 SHALL 保留上一版已成功結算的 circuits fallback rows，並透過既有 fallback/error 狀態顯示 refresh 失敗，而不是把畫面退回空白 skeleton。這個決策可避免短暫 API 失敗造成版型抖動，也讓操作人員能看到最近一次有效的配電 fallback 狀態。

替代方案是在任何 refresh failure 都清空 circuits state。這會讓 runtime 在暫時性故障時失去可用畫面，不符合 display page 對穩定呈現的要求，因此排除。

## Implementation Contract

- Behavior: 當 `Factory Circuit` 正在以 circuits source 補足 story payload 缺口時，收到 `display:sync(scope=circuits)` 或 `display:sync(scope=display-pages)` 後，頁面會重新載入 circuits source，再用最新 slot binding 與 enabled 狀態重建 fallback rows；使用者不需要手動 reload 整頁。
- Interface / data shape: `Factory Circuit` 頁面仍以 `buildFactoryCircuitViewModel({ circuits, loadState, factoryCircuitStory, ... })` 組裝畫面，但 circuits source 需要具備 bootstrap/refresh 共用的 request lifecycle，以及「最新 request 贏」的保護，避免舊 response 覆蓋新同步結果。
- Failure modes: 初次 bootstrap 失敗時，頁面維持既有 `error`/fallback 呈現；後續 sync refresh 失敗時，保留上一版已結算的 circuits rows，同時標記 refresh 失敗供既有 runtime fallback banner 使用。
- Acceptance criteria:
  - web 測試覆蓋 `Factory Circuit` fallback 在同步事件後刷新 rows 的行為。
  - web 測試覆蓋 refresh race 下較新的 circuits response 不能被較舊 response 覆蓋。
  - web 測試覆蓋 refresh failure 保留上一版 fallback rows 與錯誤狀態。
  - `pnpm --filter @solar-display/web test` 與 `spectra analyze refresh-factory-circuit-fallback-state-on-config-sync --strict` 通過。
- Scope boundaries: 本 change 只處理 `Factory Circuit` fallback circuits source refresh 與其測試；不新增 server endpoint、不改其它頁面 runtime source，也不變更 `display:sync` scope taxonomy。

## Risks / Trade-offs

- [Risk] `circuits` 與 `display-pages` 事件在短時間內連發，可能造成重複 fetch。 → Mitigation：在 page-local lifecycle 內加入 request sequencing，確保只有最後一次結果能落地。
- [Risk] 保留上一版 fallback rows 可能短暫顯示舊資料。 → Mitigation：同步保留 refresh failure 訊號，讓 runtime fallback banner 能揭露「資料刷新失敗，但仍顯示最近一次成功結果」。
- [Risk] 若 scope 選得過寬，`Factory Circuit` 會做不必要 reload。 → Mitigation：本 change 僅跟隨現有 `circuits` / `display-pages` contract，不把 `mqtt` 或其它 unrelated scopes 納入 circuits fallback reload。
