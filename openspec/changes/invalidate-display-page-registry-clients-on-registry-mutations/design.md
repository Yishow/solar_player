## Context

`generalize-display-page-registry-and-playback-model` 已把 registry 做成動態資料模型，但 client 端的 registry consumers 仍偏靜態。`useDisplayPageRegistry()` 只在 mount 時抓一次，導致 route host 與 editor route 可能繼續使用過期 registry snapshot，即使 server 已成功 create、update 或 archive page instance。

## Goals / Non-Goals

**Goals**

- 讓 registry-consuming clients 在 registry mutation 後能重新同步最新 snapshot。
- 讓 route host 與 editor runtime definitions 對新建、更新、封存頁面有一致反應。
- 補齊 registry invalidation regression tests。

**Non-Goals**

- 不重寫 registry server schema。
- 不修改 page template rendering contract。
- 不把所有 client cache 都改成新的全域 state library。

## Decisions

### Invalidate registry consumers after registry mutations

registry-consuming clients 必須在 registry mutation 後失效本地 snapshot，否則 generalized model 只在 server 端是動態的。invalidating trigger 仍沿用既有 socket/event path，不額外引入新 event taxonomy。

### Recompute route and editor definitions from the latest registry snapshot

`DisplayPageRouteHost` 與 `DisplayPagesEditorRoute` 都應以最新 registry snapshot 重新解析 route instance 與 page definitions，而不是延用 mount 時的舊資料。這樣新建/封存頁面才會反映到實際導航與編輯面。

## Implementation Contract

- Behavior: 在 display page registry create / update / archive 後，route host 與 editor SHALL 重新同步 registry snapshot，並反映最新頁面存在性、route slug、enabled 狀態與 archived 狀態。
- Interface / data shape: registry-consuming hook SHALL 提供可被 mutation event 觸發的 reload 路徑；route resolution SHALL 使用最新 hook payload，而不是 mount-time snapshot。
- Failure modes: 若 registry reload 失敗，consumer 可以保留舊 snapshot 並顯示 loading/error，但不得假裝已經反映 mutation；若 page 已封存，route host SHALL 走既有 fallback 導航。
- Acceptance criteria: `apps/web/src/pages/shared/displayPageRouteHost.test.ts` 與 `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx` SHALL 覆蓋 create / update / archive 後的 snapshot invalidation 與 route/editor refresh 行為。
- Scope boundaries: 本 change 只處理 registry snapshot invalidation，不修改 display page content config 的 draft/live publishing。

## Risks / Trade-offs

- [Risk] registry consumer 太頻繁 reload 造成不必要網路流量 → Mitigation: 只在 registry-relevant mutation 事件後刷新。
- [Risk] route host reload 時間差導致短暫導航閃爍 → Mitigation: 在 loading 狀態下保留既有 fallback 行為而非直接誤導導航。
