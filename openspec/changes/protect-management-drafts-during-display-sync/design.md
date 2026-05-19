## Context

`display:sync` 已經是管理頁之間同步 publish state、asset health、readiness 與圖片治理狀態的共用事件，但目前 `useDisplaySyncRefresh()` 只提供「收到事件就執行 callback」的薄包裝。`Playback Settings`、`MQTT Settings`、`Circuit Settings` 與 `Image Management` 因此直接在 callback 內重抓 server state，沒有判斷本地是否有未儲存表單、列表變更或 playlist 編輯。這讓背景同步雖然解決 stale summary，卻也讓管理頁變成容易遺失編輯的危險操作面。

## Goals / Non-Goals

**Goals:**

- 在不破壞既有跨頁同步能力的前提下，阻止 `display:sync` 覆蓋 dirty management draft。
- 讓四個管理頁以一致的 remote-change banner 與 operator decision contract 呈現「遠端已有新資料」。
- 讓 clean surface 繼續自動同步，避免 publish/readiness/asset summary 長時間停留舊狀態。

**Non-Goals:**

- 不改 `Display Pages Editor` 的 draft/live publish 流程。
- 不把所有管理頁改造成同一套表單框架。
- 不處理 browser unload / route leave guard；這個 change 只管 `display:sync` 背景同步。

## Decisions

### Dirty state gate before auto-refresh

每個管理頁都要先暴露一個最小 dirty contract 給共用 guard：是否存在未儲存變更、若要放棄本地編輯時應呼叫哪個 authoritative reload。`useDisplaySyncRefresh()` 不再直接代表「收到事件立刻 reload」，而是改為先經過 dirty gate 判斷。這樣可以保留原本事件拓樸，同時把危險覆蓋點集中在一個地方。

替代方案是讓每個頁面各自實作條件判斷，但那會讓 dirty 定義、提示文案與 reload 行為再次分散，未來新增管理頁時也容易漏掉保護。

### Remote-change banner and operator actions

dirty surface 收到 `display:sync` 後，統一進入 `remote-change-pending` 狀態，顯示可見 banner，而不是用 toast 或靜默旗標。banner 至少提供兩個操作：保留本地編輯、捨棄並重新同步。保留本地編輯時不動本地 draft；捨棄並重新同步時才執行 authoritative reload，並清除 pending 狀態。

替代方案是自動 merge server 資料到本地 draft，但目前這四個頁面資料形狀差異太大，強行 merge 風險比顯式決策更高。

### Surface adapters for draft detection and authoritative reload

四個頁面各自保留目前的 state shape，但要透過 adapter 對外提供共通介面：`isDirty`、`reloadNow()`、`markRemoteChange()`、`clearRemoteChange()`。這避免共用 guard 直接理解每一頁的 state 細節，也讓未來新增 `Brand Assets` 類頁面時可以選擇接入。

替代方案是把所有頁面改寫到同一個 reducer，但這會把 scope 擴成大重構，不符合這輪「立即改善」目標。

## Implementation Contract

- Behavior:
  - 當 `Playback Settings`、`MQTT Settings`、`Circuit Settings`、`Image Management` 在 clean 狀態收到 `display:sync` 時，頁面 SHALL 自動刷新 server-backed summary 與表單來源。
  - 當上述頁面在 dirty 狀態收到 `display:sync` 時，頁面 MUST NOT 覆蓋本地未儲存編輯，並 SHALL 顯示 remote-change banner。
  - 操作員選擇「重新同步」後，頁面 SHALL 放棄本地變更並載入 authoritative server state；選擇「稍後再說」後，本地 draft SHALL 保持原樣。
- Interface / data shape:
  - 共用 guard 需支援最小 surface adapter：dirty 布林、pending 狀態、`reloadNow()` callback、remote-change banner copy。
  - `useDisplaySyncRefresh()` 需要支援把 sync 事件導向 guard，而不是只暴露裸 callback。
- Failure modes:
  - 若 remote reload 失敗，頁面 SHALL 保留現有本地 draft 與 pending 狀態，並顯示錯誤訊息。
  - 若頁面本身沒有 dirty 追蹤資料，預設視為 clean surface，自動同步。
- Acceptance criteria:
  - 針對四個管理頁新增測試或既有測試覆蓋：dirty surface 收到 sync 不覆蓋、clean surface 收到 sync 會刷新、discard-and-reload 能清掉 pending。
  - `pnpm exec spectra analyze protect-management-drafts-during-display-sync` 與 `pnpm exec spectra validate --strict --changes protect-management-drafts-during-display-sync` 通過。
- Scope boundaries:
  - In scope: `display:sync` 到管理頁的同步安全、banner 行為、reload gating。
  - Out of scope: publish editor UX、跨分頁 route leave guard、任何 server event schema 變更。

## Risks / Trade-offs

- [Risk] dirty 判斷過度寬鬆，導致頁面長時間不自動更新 → Mitigation: 只把未儲存 user edit 視為 dirty，並提供明確的手動重新同步。
- [Risk] 四頁 adapter 語意不一致，banner 仍會出現例外 → Mitigation: 共用 guard 只接受明確 adapter contract，並以 component test 鎖住互動。
- [Risk] 使用者忽略 remote-change banner，導致看到舊摘要 → Mitigation: pending 狀態保持可見，直到 reload 或 save 完成。
