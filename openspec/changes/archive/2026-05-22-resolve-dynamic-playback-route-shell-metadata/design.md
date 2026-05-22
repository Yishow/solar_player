## Context

目前 `DisplayPageRouteHost` 已經能透過 registry 將自訂 slug 對應到 runtime page instance，但 playback shell 其他部分仍依賴靜態 `routeMeta.ts`。`LayoutShell` 用它判斷 route group 與 offline redirect，`AppFooterNav` 用它建立播放 tabs 與 active state；因此只要路徑不是內建 canonical route，shell 就會退回預設 metadata，而不是使用實際 page instance 的名稱、順序與能力。

這個 change 涉及 shell、routing、registry refresh 與 operator-facing playback UI，因此需要在 proposal 之上補一層明確設計，避免 apply 時把 duplicate instance preview、editor page picker 或管理頁 metadata 一起混進來。

## Goals / Non-Goals

**Goals:**

- 讓 playback shell 能從 registry-backed page instance 解析播放頁 metadata，而不是把未知 slug 當成 `/overview`。
- 讓 footer navigation、active state 與 offline eligibility 對 duplicate template instances、自訂 slug 與 canonical routes 都使用同一份解析結果。
- 讓 registry mutation 後的 shell metadata consumer 能跟 route host 一樣重載最新 registry snapshot。

**Non-Goals:**

- 不改 `DisplayPagesEditor` 的 page picker、authoring schema 或管理頁 shell metadata。
- 不處理 `Playback Settings` / `Slideshow Preview` 的 live preview instance mismatch；那是另一個 change。
- 不新增新的 registry mutation API，也不變更 `display_page_registry` 資料表結構。

## Decisions

### Decision: Introduce a playback route metadata resolver built on registry instances

新增一層 playback route metadata resolver，輸入為目前 pathname 與 registry active pages，輸出為 route shell 所需的 metadata：page key、resolved path、nav label、title/subtitle、display order、route group 與 offline eligibility。這層 resolver 必須能分辨 canonical built-in routes 與 registry duplicate instances，且 unknown slug 只有在 registry 確認不存在時才走既有 fallback。

這樣可以把 `DisplayPageRouteHost` 已有的 registry awareness 擴大到 shell，而不必把 `AppFooterNav`、`LayoutShell` 直接耦合到 raw registry rows 或 runtime page definitions。

### Decision: Keep static routeMeta as the source of truth only for management and fixed playback defaults

`routeMeta.ts` 不直接刪除，因為管理頁仍是固定 route inventory，且 built-in playback templates 仍需要提供預設文案與 shell density。這個 change 只把 playback runtime path 的最終 metadata 解析改成「靜態 defaults + registry instance overlay」，管理 routes 繼續使用既有 `routeMetaMap`。

這比完全移除 `routeMeta.ts` 風險低，且能把變更限制在 playback shell family，不擴散到整站所有 title/nav consumer。

### Decision: Refresh shell metadata consumers through the existing display-pages invalidation path

`useDisplayPageRegistry()` 已經會在 `display:sync(scope=display-pages)` 時重抓 registry snapshot。這個 change 不新增新的 socket event，而是讓 `LayoutShell`、footer active-state builder 與 offline routing 都依賴同一份 refreshed registry-backed metadata。如此一來 create/update/archive/disable page instance 後，播放 shell 與 route host 的收斂時機相同，不會出現「route content 已更新但 footer/offline 判斷仍是舊資料」的分裂狀態。

## Implementation Contract

- Behavior:
  - 當播放路徑對應到 registry active page instance 時，shell SHALL 顯示該 instance 的 nav label 與排序位置，且 active state SHALL 跟著實際 slug，而不是 fallback 到 canonical built-in route。
  - 當 registry-backed playback page 被 archive 或 disable 後，shell SHALL 在 registry refresh 後停止把該 slug 視為有效 playback route，footer 也 SHALL 移除該項目。
  - 當播放 shell 需要判斷 offline redirect eligibility 時，判斷 SHALL 基於 resolved playback route metadata，而不是靜態 unknown-route fallback。
- Interface / data shape:
  - 新增一個 playback route metadata module，對外至少提供「依 pathname 解析 route metadata」與「依 active registry pages 建立 playback footer entries」兩類 helper。
  - `useDisplayPageRegistry()` 仍維持目前 API shape，但其 consumers SHALL 不再各自對未知 pathname 做 `/overview` fallback。
- Failure modes:
  - registry 載入中時，shell 可暫時保留既有 loading-safe 行為；但 registry 載入完成後若 pathname 不存在於 active pages，才可走既有 fallback route。
  - registry reload 失敗時，shell SHALL 保留最後一次成功解析的 playback metadata，避免因瞬時 reload failure 把有效播放頁誤判成 unknown route。
- Acceptance criteria:
  - 自動測試需覆蓋 duplicate template instance、自訂 slug、archive/disable 後 footer 與 active state 收斂、以及 offline routing 對 registry-backed page 的判斷。
  - `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web build` SHALL 通過。
- Scope boundaries:
  - In scope: playback shell metadata resolution、footer entries、active state、offline eligibility、registry invalidation coverage。
  - Out of scope: management route metadata、live preview rendering、editor authoring UX、server registry schema 變更。

## Risks / Trade-offs

- [Risk] route metadata 解析同時讀靜態 defaults 與 registry rows，若 mapping 規則不清楚，容易再次產生兩套 source of truth。
  → Mitigation: 將 resolver 輸出 shape 集中成單一 helper，footer/offline/layout 只消費 resolver 結果。
- [Risk] registry reload 期間 shell 可能出現短暫空狀態或錯誤 fallback。
  → Mitigation: 明確定義 loading 與 reload failure 時保留 last-known-good metadata 的行為。
- [Risk] 若 apply 時順手把管理頁也改成動態 metadata，scope 會迅速膨脹。
  → Mitigation: 在 tasks 與 spec 中明確把 management routes 標成 out of scope。
