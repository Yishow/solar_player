## Problem

P2 修正：useDisplayPageConfig 的 draft save 成功後只更新 React session，沒有同步 module-level stage/page cache；remount 可能讀到 save 前的 version，造成可避免的 409。save 前的 read 也可能把 cache 或仍掛載的 session 降回舊基線。server 已有 optimistic concurrency；這是 client coherence 缺陷，不是已證實的 server silent overwrite。

## Root Cause

primeDisplayPageConfigCache 只 set cache；loader sequence 只阻止舊結果寫 cache，仍把舊 envelope 回傳 caller。save 不推進 module generation 或 owner 的 loadRequestId。pending map 也沒有在權威 commit 後 detach 舊 Promise。現行非 force read 先查 cache 才查 pending，因此不宣稱 cache-hot caller 一定加入舊 Promise。

## Proposed Solution

- 讓 draft save 回傳的 server envelope 同時成為對應 stage/page cache 與 React session 的 authoritative snapshot。
- 讓權威 cache prime/save/conflict commit 成為 per-key barrier，先使舊 read generation 失效並 detach 舊 pending；loader 與實際 reload/hydration 都驗證 currentness，禁止舊 envelope/error/finally 改 cache、session、error 或較新 loading。
- 維持 stage/page cache key isolation，避免 live、draft 或不同 display page 互相污染；remount 應以最新 saved version 建立 session 與 baseVersion。
- 409 latestEnvelope 固定更新 matching cache 與 active session baseline，但保留 active local draft；普通 failed save 沒有權威 envelope 時不改 cache/baseline。不改 server concurrency/API、視覺、layout 或 FHD acceptance。

## Success Criteria

- 在實際 mounted hook 測試 v4→save v5→unmount/remount→下一次 save baseVersion=5，而非只呼叫 cache helper。
- deferred read 在 save 後 resolve/reject 不得把 cache 或 session 降回 v4，不得改新 error/loading；舊 pending finalizer 不刪除新 pending。保留 warm cache、force-failure 與 stage/page isolation。
- 409 latest v6 固定發布 cache/baseline v6 且保留 local edits/dirty；下一次 save baseVersion=6，普通 failed save 則仍保留 cache v4。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- management-draft-save-concurrency：要求成功的 display-page draft save 將回傳 envelope 發布到 client cache/session，並在後續 remount 或 save 前使較舊 read generations 失效。

## Impact

- Affected specs：management-draft-save-concurrency。shared-registry-config-warm-cache 作為 cache/session 行為參考，其 live-stage 與 fallback semantics 不變。
- Affected code：
  - Modified：apps/web/src/hooks/useDisplayPageConfig.ts
  - Modified：apps/web/src/hooks/useDisplayPageConfig.test.ts
  - New：（無）
  - Removed：（無）
