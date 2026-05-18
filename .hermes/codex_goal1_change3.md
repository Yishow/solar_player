嚴格按照 Spectra change `add-display-playback-rotation-controls` 完成實作。

**工作目錄：** /Users/yishow/prj/solar_player/

⚠️ 重要：絕對不可修改 AGENTS.md 或 CLAUDE.md 檔案。不可在任何檔案中加入 <claude-mem-context> 或 <codex-mem-context> 區塊。如果發現 AGENTS.md 有未提交變更，立即執行 `git checkout AGENTS.md` 並繼續。

**已讀取檔案：**
- openspec/changes/add-display-playback-rotation-controls/proposal.md
- openspec/changes/add-display-playback-rotation-controls/design.md
- openspec/changes/add-display-playback-rotation-controls/tasks.md
- openspec/changes/add-display-playback-rotation-controls/specs/display-page-conditional-playback/spec.md
- openspec/changes/add-display-playback-rotation-controls/specs/display-page-rotation-plan/spec.md
- openspec/changes/add-display-playback-rotation-controls/specs/display-page-skip-reason-reporting/spec.md
- AGENTS.md（僅讀取約束，不可修改）
- CLAUDE.md（僅讀取約束，不可修改）

**Proposal 摘要：**
建立展示頁 rotation plan（啟用狀態、播放秒數、排序）、條件式播放控制（依資料新鮮度、素材健康、排程、維護狀態決定是否播放）、skip reason 與 fallback route policy、管理端 rotation 預覽。

**Design Decisions：**
- rotation plan 不附屬單一 display page config，維持在播放層 shared model，與 PlaybackSettings、PlaybackPage 同一層協作。
- conditional playback 在 runtime 決策，產生明確 skip reason：disabled, out-of-schedule, unpublished, asset-unhealthy, data-not-ready。
- rotation preview 不僅在播放器 hook，也在 management surface 提供。
- 所有頁面都不可播時，回退到既有 offline 或安全畫面。

**Implementation Contract：**
- 維運人員可設定 display page 的正式輪播順序、啟用狀態與停留秒數。
- runtime 依 schedule、頁面 readiness 與健康狀態決定是否播放，保留 skip reason。
- PlaybackSettings 或其他 management surface 可預覽當前條件下的有效輪播鏈。
- 共享型別支援 rotation plan 與 skip reason 枚舉。
- server 提供 rotation plan 讀寫與預覽結果查詢，回應包含 playablePages, skippedPages, skipReason。
- 未知 skip reason 不得靜默吞掉，應作為可診斷字串返回。

**實作範圍：**
- apps/server/src/routes/playback.ts
- apps/server/src/routes/display-pages.ts
- apps/server/src/services/displayRotationService.ts（新檔案）
- packages/shared/src/displayRotation.ts（新檔案）
- apps/web/src/pages/PlaybackSettings/
- apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts（新檔案）
- apps/web/src/layouts/DisplayCanvas.tsx
- apps/web/src/layouts/offlineRouting.ts
- apps/web/src/services/api.ts
- packages/shared/src/index.ts
- 測試檔案

**Constraints（嚴格遵守）：**
- 不修改 AGENTS.md、CLAUDE.md、deploy/、package.json、lockfile
- 不引入新依賴
- 正式 playback routes 不得掛 editor overlay
- 現有 API 回應形狀跟隨既有 route 慣例
- Existing tests start failing — this is a regression, do not fix by editing tests, adding .skip, or weakening assertions
- 所有 .ts 檔案不得超過 400 行

**Tasks（6 個 task，全部需完成並打勾 tasks.md）：**

Task 1.1: Maintain a first-class rotation plan for display pages — extending playback persistence and shared types for page order, enabled state, and duration. Verified by server test coverage for rotation plan reads/writes.

Task 1.2: Show rotation plan preview in management workflow — updating playback-related management UI to render effective configured sequence and durations. Verified by targeted web tests or manual preview.

Task 2.1: Evaluate conditional playback at runtime — applying readiness, schedule, and health checks before page selection, with explicit skip reasons. Verified by shared playback resolver tests and targeted server tests.

Task 2.2: Reuse conditional playback result in management preview — exposing same evaluation output to management preview APIs. Verified by tests comparing runtime and preview results for same inputs.

Task 3.1: Record skip reason reporting for skipped display pages — returning machine-readable skip reasons from rotation diagnostics and preview responses. Verified by targeted server route tests.

Task 3.2: Preserve a safe fallback when no display pages are playable — keeping existing safe playback or offline behavior when all pages are skipped. Verified by pnpm --filter @solar-display/web test around playback controller and offline routing behavior.

**每完成 1 個 task：**
1. Code review
2. Fix bugs
3. Commit with zh-tw（Traditional Chinese）
4. 確認 AGENTS.md 未變更（如有變更執行 git checkout AGENTS.md）

**Stop if：**
- 需要新增依賴、pnpm install
- 現有測試失敗且無法在不修改測試的情況下修復
- 需要不可逆地改寫既有 playback_pages 資料且無法提供可回滾 migration
- rotation plan 與既有 playback settings 重疊衝突需自行裁決

**Done when：**
1. tasks.md 全部打勾（- [ ] → - [x]）
2. pnpm --filter @solar-display/server exec tsx --test src/routes/playback.test.ts exit 0
3. pnpm --filter @solar-display/web test exit 0
4. pnpm run build exit 0
5. git diff --name-only 不含 AGENTS.md、CLAUDE.md、deploy/、package.json、lockfile
6. 最終 summary 列出 rotation plan shape、skip reason enum、conditional playback rules、preview API response shape、fallback behavior
