## 1. 可信 Context 與隔離 TDD

- [x] 1.1 先建立 Management API → Pairing → authenticated playback failing seam，覆蓋 Resolve a trusted Display Client Context、Fail closed when Device context is unavailable、Page-scoped Story runtime enforces Display Client Context；直跑 src/routes/device-context-playback.test.ts 驗證 401/403 與無跨 Site payload。
- [x] 1.2 實作 Resolve site only from authenticated Display Client Context，使 Device/Group/Profile/contextRevision 由 credential 唯一解析；以 plugin unit tests 與 Fastify inject 驗證 query/header claim 被忽略。
- [x] 1.3 實作 Project all site-sensitive data before rotation evaluation，使 Produce Site-scoped Story, Readiness, and Effective Rotation、Device-scoped Factory Circuit routing overrides global playback enablement、Device-scoped Sustainability uses the Context Site Scope 成立；以 CL/KN Story integration tests 驗證。
- [x] 1.4 [P] 更新 Evaluate rotation with Profile and Site context on the Server 與 Readiness checks are scoped to the Display Client Site，讓另一 Site stale/missing 不阻擋；以 shared evaluator 與 readiness route tests 驗證。

## 2. Cache 與安全播放邊界

- [x] 2.1 實作 Cache by profile state and site scope 與 Reuse equivalent Effective Rotation snapshots；以 25 CL＋25 KN contract fixture 驗證每 revision 每 Site 最多一次 full evaluation。
- [x] 2.2 實作 Apply context changes at the safe playback boundary 與 Apply Site changes at a Safe Playback Boundary；以 controlled monotonic clock 測試 current page valid/invalid、start page fallback 與 bounded transition。
- [x] 2.3 [P] 更新 shared/web context types 與 playback controller，使 Client 只播放 Server 結果、不做第二次 Site filter；以 web hook tests 驗證。

## 3. 驗證與 FHD 證據

- [x] 3.1 執行 server/shared/web focused tests、pnpm test、pnpm build、pnpm verify 與 spectra analyze device-context-site-scoped-playback。
- [x] 3.2 以 pnpm run fhd:witness -- --base-url <url> 產生五頁 fresh screenshots、gap notes 與 evidence bundle；由使用者判定 Site 內容差異與 launch quality。
