嚴格按照 Spectra change `add-display-page-asset-governance` 完成實作。

**工作目錄：** /Users/yishow/prj/solar_player/

⚠️ 重要：絕對不可修改 AGENTS.md 或 CLAUDE.md 檔案。不可在任何檔案中加入 <claude-mem-context> 或 <codex-mem-context> 區塊。如果發現 AGENTS.md 有未提交變更，立即執行 `git checkout AGENTS.md` 並繼續。

**已讀取檔案：**
- openspec/changes/add-display-page-asset-governance/proposal.md
- openspec/changes/add-display-page-asset-governance/design.md
- openspec/changes/add-display-page-asset-governance/tasks.md
- openspec/changes/add-display-page-asset-governance/specs/display-page-asset-health-reporting/spec.md
- openspec/changes/add-display-page-asset-governance/specs/display-page-asset-library-binding/spec.md
- openspec/changes/add-display-page-asset-governance/specs/display-page-media-placement-controls/spec.md

**實作範圍：**
- apps/server/src/routes/display-pages.ts
- apps/server/src/routes/images.ts
- apps/server/src/services/displayPagePublishingService.ts
- apps/web/src/pages/DisplayPagesEditor/
- apps/web/src/pages/ImageManagement/
- apps/web/src/services/api.ts
- apps/web/src/hooks/useDisplayPageConfig.ts
- packages/shared/src/ 中 asset governance 直接需要的檔案
- 測試檔案

**Constraints：**
- 不修改 AGENTS.md、CLAUDE.md、deploy/、package.json、lockfile
- 不引入新依賴
- 正式 playback routes 不得掛 editor overlay
- 現有 API 回應形狀跟隨既有 route 慣例
- Existing tests start failing — this is a regression, do not fix by editing tests, adding .skip, or weakening assertions
- 所有 .ts 檔案不得超過 400 行

**Tasks（6 個 task）：**

Task 1.1: Bind display page media fields to managed asset library references — extending shared config and server resolution for managed asset identifiers.

Task 1.2: Protect managed asset references from silent breakage — surfacing missing/unresolved asset findings.

Task 2.1: Provide per-binding media placement controls — focal point, fit behavior, alignment in editor and runtime.

Task 2.2: Keep media placement controls within safe bounds — validate placement values on save/publish.

Task 3.1: Report asset health for display page references — server-side health computation returning affected pages and reasons.

Task 3.2: Show asset health reporting in DisplayPagesEditor and ImageManagement — web tests for rendered status states.

**每完成 1 個 task：**
1. Code review
2. Fix bugs
3. Commit with zh-tw（Traditional Chinese）
4. 確認 AGENTS.md 未變更（如有變更執行 git checkout AGENTS.md）

**Stop if：**
- 需要新增依賴、pnpm install
- 現有測試失敗且無法在不修改測試的情況下修復
- 需要不可逆地改寫既有資料且無法提供可回滾 migration

**Done when：**
1. tasks.md 全部打勾（- [ ] → - [x]）
2. pnpm --filter @solar-display/server exec tsx --test src/routes/display-pages.test.ts exit 0
3. pnpm --filter @solar-display/web test exit 0
4. pnpm run build exit 0
5. git diff --name-only 不含 AGENTS.md、CLAUDE.md、deploy/、package.json、lockfile
6. 最終 summary 列出 asset reference fields、media placement fields、health report shape
