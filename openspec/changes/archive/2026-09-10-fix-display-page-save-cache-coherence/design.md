## Context

useDisplayPageConfig 以 stage:page 為 cache key，使用 displayPageConfigCache、pendingDisplayPageConfigRequests 與 displayPageConfigRequestSequences 共用 envelope。primeDisplayPageConfigCache 目前只 set cache；loadDisplayPageConfigEnvelope 的 response 以 request sequence 判斷是否可 prime。draft save 成功後，useDisplayPageConfig.save 只以 server envelope 建立 React session，沒有更新 module cache，因此 remount 仍可能從舊 cache 建立 session。若 save 前的 read 尚未完成，prime 沒有推進 sequence，晚到 read 也可能覆蓋 save 後的 envelope。

server 已有 optimistic-concurrency baseVersion 與 409 latestEnvelope contract；本 change 只修 client cache/session coherence。shared-registry-config-warm-cache 提供 live cache reuse、fallback 與 draft isolation 的既有參考，本 change 不改 server response shape、visual/layout 或 FHD 流程。

另一條必要邊界是 active reload/hydration：loader 即使不寫 cache，仍回傳舊 envelope；save 沒推進 owner loadRequestId，該舊值可能重建 session。非 force loader 先查 cache、再查 pending；現有 pending finalizer 已有 Promise identity check，須保留而不是替換成無條件 delete。

## Goals / Non-Goals

**Goals:**

- 讓成功的 draft save envelope 成為同一 stage/page 的 cache 與 active React session 的最新 authoritative snapshot。
- 使權威 cache prime/save/conflict commit 成為 module 與 session 的 per-key barrier，阻止晚到 read 回寫舊 envelope/error/loading，並 detach 舊 pending。
- 保持 stage/page isolation，涵蓋同 page 不同 stage 與不同 page 同 stage。
- 保留 409 conflict 的 local draft、latest server baseline 與下一次 save 使用的 newest baseVersion。

**Non-Goals:**

- 不修改 server optimistic-concurrency route、409 response 或 API schema；不宣稱 server 原本會 silent overwrite。
- 不改 live runtime rendering、fallback policy、display page merge semantics 或 route topology。
- 不修改非 display-page cache、其他 management drafts、視覺/layout、FHD acceptance 或 deployment。

## Decisions

### Decision 1: Save envelope commits cache and session through one write path

沿用 DisplayPageConfigEnvelope 作為唯一 client snapshot。成功 save 取得 envelope 後，先以同一個 stage/page key 提交 module cache，再用同一 envelope 建立 active session；session 的 config、lastLoadedEnvelope、fallbackPolicy 與 dirty 必須由該 server envelope 推導，讓稍後 remount 直接得到新 version。保留 primeDisplayPageConfigCache 的既有 pageId、stage、envelope 參數形狀，將其語意提升為可使舊 reads 失效的 cache commit。

commit 在 publish 前先失效舊 module generation/pending 與該 owner 的 loadRequestId，再提交相同 server envelope；同時結束被本次 commit 接管的舊 loading，不能等待舊 finally 解鎖。其他 session 不因 cache publication 自動丟棄自己的 dirty draft，但其 in-flight reads 同樣不得接受 obsolete 結果。已停用、切換 page-stage 或 unmounted owner 不得由晚到 handler 寫入新頁狀態。

替代方案是只在 remount 時強制重新讀取 server。這會增加 blocking read、仍留下同一批 in-flight response 的競態，也無法讓同一頁的其他 consumer 立即看到 save envelope，因此採用既有 shared cache 的 write-through commit。

### Decision 2: Per-key read currentness covers pending and every consumer

權威 external prime、save 與 conflict commit 推進 stage:page generation，先 detach 舊 pending 再 publish。正常 current read 的 cache publication 保留該 read 的 current token，不因重用 external-prime invalidation 而把自己誤判 stale。舊 pending 的 finally 仍僅在 map 中是同一 Promise 時 delete，不能清掉較新 pending。

loader 內部提供帶 token/currentness 的 read outcome，hook 的 hydration/reload 在 success、catch、finally 都檢查 module generation、owner loadRequestId 與 page/stage/mounted identity。obsolete completion 不可提交 envelope、seed fallback、error/message 或修改較新 loading。原生 Promise 可以完成，但 obsolete payload/error 不得當作目前結果傳給任何 consumer。公開 loadDisplayPageConfigEnvelope 的參數與 Promise<DisplayPageConfigEnvelope> 相容；其 adapter 對 superseded read 改取已發布的新 cache 或目前 pending 的 current outcome，而不是回傳舊 envelope/舊錯誤。沒有新成功 envelope 時，沿用目前有效讀取的失敗契約，不偽造 success。

owner 不得把 obsolete finally 當成唯一 loading release：save/invalidation 接管時結束自己的舊 loading，或由新的 current-result reconciliation 接管。測試必須確認不永久 loading，也不由舊 finally 提早清除新 request 的 loading。這些 seam 都留在現有 hook module，不新增全域 editor state system。

替代方案是全域單一 sequence 或只用 envelope version 比較。全域 sequence 會使無關 page/stage 互相取消，version 比較也無法涵蓋 fallback、同版本重讀與外部 prime 的 write ordering，因此採用 per-key generation。

### Decision 3: Keep conflict session local while advancing the newest baseVersion

成功 save 使用 returned envelope 建立 clean session，下一次 save 使用 returned version。409 conflict 則固定將 latestEnvelope 發布為同 key cache snapshot，並經同一 barrier 使舊 reads 失效；active session 經 applyDisplayPageSaveConflict rebase 到最新 server baseline，保留 local config/dirty，將 lastLoadedEnvelope.version 更新為 currentVersion，下一次 save 帶 newest baseVersion。cache publication 不替換 active draft。普通 network/server failure 沒有權威 conflict envelope 時，不改 cache、draft 或 baseline；409 不屬此類，不能以「所有 save failure 不改 cache」概括。

替代方案是 conflict 時直接丟棄 local session 或讓 active session 重新取 cache。這會違反 management-draft-save-concurrency 的 draft retention contract，因此保留 session-local draft，僅更新其 server baseline。

## Implementation Contract

- Behavior：v4→save v5 後 cache/session/remount 都使用 v5，下一次 save baseVersion=5；晚到 v4 success/error 不得 downgrade cache/session 或影響新 error/loading。409 latest v6 使 cache/baseline=6、local draft 保留，retry baseVersion=6。
- Interface / data shape：保留公開 prime/loader/update API 的參數與 envelope shape；內部 read outcome 增加 token/currentness，並由 owner barrier 保護所有 session writes。pending 保留 identity-finalizer guard，live/draft/page keys 獨立。
- Failure modes：普通 failed save 不改 cache/baseline；409 固定發布 latest envelope 但不替換 draft。obsolete read 不得回傳可被誤提交的 stale payload/error；force-read 真實 failure 保留 warm cache 契約，不能被吞成成功。
- Acceptance criteria：在 apps/web/src/hooks/useDisplayPageConfig.test.ts 增加 jsdom/react-dom mounted hook harness，實際呼叫 save、reload、unmount/remount，以 deferred success/rejection 測 cache/session/baseVersion、error/loading、pending-finalizer identity；補 ordinary failure、409、外部 prime、stage/page isolation。不能只測純 cache helper。先 focused test/review 修正，最後 pnpm verify；proposal 階段不執行。
- In scope：只修改 apps/web/src/hooks/useDisplayPageConfig.ts 與 apps/web/src/hooks/useDisplayPageConfig.test.ts。
- Out of scope：server/API、其他 cache、其他 changes、visual/layout、FHD、deploy。此 propose 不改 main specs；未來 spec sync 依正式 closeout workflow。

## Risks / Trade-offs

- [Risk] prime 與 loader 互相遞增 sequence 造成合法最新 response 被誤判 → 將 sequence check 與 cache write 放在單一小函式，測試首次 read、force read、外部 prime 與 save commit 的順序。
- [Risk] conflict cache snapshot 影響 active draft → cache write 不直接呼叫 active session setter，並以 conflict regression 證明 local config 與 dirty 保留。
- [Risk] stage/page key 遺漏導致 cross-page contamination → 保留既有 stage:page key 組合，加入 live/draft 與不同 page 的矩陣測試。

## Migration Plan

不需要資料 migration 或 server rollout。apply 階段先補 cache/save focused regression，再以最小 client hook 修改完成；rollback 只需回復本 change 的 scoped client/test diff，不觸碰既有 untracked changes。

## Open Questions

無；save success、409 conflict、late read 與 stage/page isolation 的 client contract 已固定。若 apply 發現必須改 server/API 或其他 cache，必須停止並回報主代理。
