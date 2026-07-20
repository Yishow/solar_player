## Context

目前 server 在 `buildApp()` 直接設定 `origin: true`，等於所有來源都可對 mutation routes 發請求。多數管理頁已有 `useDisplaySyncDraftGuard()`，但 `BrandAssets` 還是自管 dirty confirm，沒有 shared remote-sync 行為。這代表操作治理與 API 防護都還停留在 MVP 前期狀態。

## Goals / Non-Goals

**Goals**

- 為 management mutation APIs 建立正式 access boundary。
- 收斂 trusted origin / token / local-operator policy。
- 讓管理頁 dirty-state governance 一致。

**Non-Goals**

- 不做完整 IAM/RBAC。
- 不在這個 change 直接改 shell 或 display runtime。

## Decisions

### Secure mutations first, not every read route

決策：優先保護 mutation routes 與敏感操作，再視需要延伸到 read-only diagnostics。

理由：這輪最大風險在可寫操作過寬，不是所有 GET 都先要關起來。

### Use a single management access mechanism

決策：管理端應有單一 access mechanism，例如 trusted origin + admin token/header，而不是每條 route 各自判斷。

理由：分散實作會讓新 route 再次漏掉。

### Apply shared draft governance to all mutable management pages

決策：所有可修改 settings/content 的管理頁都應納入 shared draft/remote-sync handling，包括 `BrandAssets`。

理由：目前管理治理規則在大多數頁面存在，但仍有缺口，會造成使用者體感不一致。

## Implementation Contract

1. mutation APIs MUST require the configured management access boundary.
2. server CORS MUST default to trusted management origins instead of unrestricted cross-origin access.
3. mutable management pages SHALL use a shared dirty-state and remote-sync governance pattern where applicable.
4. destructive actions SHOULD emit audit or operator-visible event metadata for troubleshooting.

## Risks / Trade-offs

- 若 access boundary 太重，單機 demo workflow 會變麻煩，需要提供清楚的 local operator 配置。
- 若只保護部分 routes，新的 mutation endpoint 仍可能漏網。
- `BrandAssets` 接入 shared governance 後，現有 confirm-based UX 可能需要重新整理成更一致的 state flow。
