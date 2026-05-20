## Context

多個 management surfaces 已經接上 `display:sync` 與 draft guard，但目前共用 refresh hook 不看 `scope`。結果品牌、MQTT、播放設定、圖片管理、迴路設定、裝置狀態等頁面都可能因不相干事件被重載或跳 remote-change banner。這不會直接讓系統壞掉，但會持續侵蝕治理面的可用性。

## Goals / Non-Goals

**Goals**

- 讓 management surfaces 只對相關 `display:sync.scope` 做 refresh 或 draft warning。
- 區分立即刷新與延後套用草稿衝突的語意。
- 讓跨頁 management sync noise 可被測試鎖住。

**Non-Goals**

- 不修改 display runtime pages 的 shared runtime refresh registry。
- 不新增新的 socket event 類型。
- 不重寫各頁自己的資料載入邏輯。

## Decisions

### Route display sync through surface-specific scope filters

每個 management surface 都應明確宣告自己關注哪些 `display:sync.scope`。共用 hook 只負責分發相關事件，不再把所有 sync 當成全域 invalidation。

### Distinguish immediate refresh from deferred draft conflicts

沒有草稿的頁面可以對相關 scope 立即 refresh；有草稿的頁面則只對相關 scope 標記 pending remote change。這能保留既有 draft guard 的安全性，同時避免 unrelated scope 一直觸發 banner。

## Implementation Contract

- Behavior: management surfaces SHALL 只在收到相關 `display:sync.scope` 時刷新或標記 pending remote change；不相干 scope SHALL 被忽略。
- Interface / data shape: 共用 refresh hook SHALL 接受或封裝 surface-specific scope filter；draft guard SHALL 只在 relevant remote change 到達時進入 pending state。
- Failure modes: 若 relevant refresh 失敗，頁面仍可顯示自己的 error banner；若 event scope 不相干，頁面不得因 hook 行為進入誤導性的 dirty conflict 狀態。
- Acceptance criteria: `apps/web/src/pages/managementDisplaySync.test.ts` SHALL 覆蓋 brand、MQTT、playback、images、circuits、device status 對 relevant / irrelevant scope 的反應差異。
- Scope boundaries: 本 change 只收斂 management-side sync 噪音，不改變 server event taxonomy 或 playback runtime refresh plan。

## Risks / Trade-offs

- [Risk] scope mapping 漏掉某個頁面需要的事件 → Mitigation: 為各頁明列 scope 清單並用 regression tests 驗證。
- [Risk] hook 抽象過度會讓每頁更難理解 → Mitigation: 讓 hook 只做 scope gating，把頁面自己的 reload 邏輯留在原本 surface。
