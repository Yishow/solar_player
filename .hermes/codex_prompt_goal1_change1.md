嚴格按照 Spectra change `strengthen-display-page-publishing-and-safety` 完成實作。

**工作目錄：** /Users/yishow/prj/solar_player/

**First action 已完成：** 以下檔案已逐字讀取：
- openspec/changes/strengthen-display-page-publishing-and-safety/proposal.md
- openspec/changes/strengthen-display-page-publishing-and-safety/design.md
- openspec/changes/strengthen-display-page-publishing-and-safety/tasks.md
- openspec/changes/strengthen-display-page-publishing-and-safety/specs/display-page-draft-live-publishing/spec.md
- openspec/changes/strengthen-display-page-publishing-and-safety/specs/display-page-fallback-policies/spec.md
- openspec/changes/strengthen-display-page-publishing-and-safety/specs/display-page-layout-safety-guards/spec.md
- AGENTS.md
- CLAUDE.md

計數回報：
- tasks.md 總數：18（6+6+6）
- 九份 spec.md 的 SHALL / Requirement 總數：18（每份 2 requirements × 9）
- AGENTS.md / CLAUDE.md 關鍵約束：禁止修改 AGENTS.md、CLAUDE.md、deploy/、package.json、lockfile；不得新增依賴；正式 playback routes 不得掛 editor overlay；現有 API 回應形狀跟隨既有 route 慣例；測試失敗不得用 .skip 繞過。

**實作範圍（僅限此 change 直接要求的檔案）：**
- apps/server/src/routes/display-pages.ts
- apps/server/src/routes/images.ts
- apps/server/src/routes/playback.ts
- 相關新 service / migration
- apps/web/src/pages/DisplayPagesEditor/
- apps/web/src/pages/PlaybackSettings/
- apps/web/src/services/api.ts
- apps/web/src/hooks/useDisplayPageConfig.ts
- packages/shared/src/ 中此 change 直接需要的檔案
- 測試檔案

**Constraints（必須嚴格遵守）：**
- 嚴格遵守 AGENTS.md / CLAUDE.md；root 正式入口只以 package.json scripts、apps/、packages/、deploy/、openspec/ 為準。
- 不修改 AGENTS.md、CLAUDE.md、deploy/、以及與這三個 change 無關的管理頁或展示內容頁。
- 不引入新依賴；package.json、lockfile 不得變更。
- 正式 playback routes 不得掛 editor overlay；editor 互動只留在 management route。
- 現有 API 回應形狀要跟隨既有 route 慣例，不要任意重包新 envelope。
- Existing tests start failing — this is a regression, do not fix by editing tests, adding `.skip`, or weakening assertions.

**Tasks（tasks.md 中的 6 個 task，全部需完成並打勾）：**

**Task 1.1:** Deliver `Provide draft and live publishing channels for display page configuration` by extending the shared envelope and server persistence to store `draft` and `live` stages with version metadata, verified by `pnpm --filter @solar-display/server test` covering stage-specific reads and writes.

**Task 1.2:** Deliver `Support publish history and rollback for live display page configuration` and reference `Separate draft and live config channels` by adding publish and rollback APIs plus history reads, verified by targeted server route tests that publish a draft, read the new live version, and roll back successfully.

**Task 2.1:** Deliver `Run layout safety guards before publish` and reference `Run layout safety guards before publish` by adding blocking server-side validation for geometry, required content, and invalid values, verified by targeted server tests that reject invalid publish payloads with structured findings.

**Task 2.2:** Deliver `Surface layout safety guards results in the editor workflow` by showing region-aware validation results and publish blocking state inside `apps/web/src/pages/DisplayPagesEditor/index.tsx`, verified by `pnpm --filter @solar-display/web test -- src/pages/DisplayPagesEditor/index.test.tsx`.

**Task 3.1:** Deliver `Keep fallback policy in shared display page configuration metadata` and reference `Keep fallback policy in shared config metadata` by defining shared fallback policy fields and reading them from live runtime pages, verified by `pnpm --filter @solar-display/web test -- src/hooks/useDisplayPageConfig.test.ts` and targeted runtime tests.

**Task 3.2:** Deliver `Expose fallback policy status to management surfaces` by returning effective fallback state from display page management APIs and showing it in publishing status UI, verified by manual inspection of `/display-pages/editor` plus targeted server response tests.

**每完成 1 個 task 時要：**
1. Code review — 檢查 type safety、error handling、response shape 一致性
2. Fix bugs — 修復發現的問題
3. Commit with zh-tw — git commit 訊息用 Traditional Chinese，詳細描述變更
4. 回報到 telegram — 完成 task 後回報進度

**Stop if 條件（遇到任何一項立即停止並回報）：**
- package.json、lockfile、AGENTS.md、CLAUDE.md、deploy/ 任一檔案出現在 git diff
- 需要新增依賴、執行 pnpm install、或修改 Node / pnpm 版本
- 現有 server 或 web 測試開始失敗，或任何測試靠 .skip / disabled 才通過
- 實作需要不可逆地改寫既有 display_page_configs / playback_pages 資料，且無法提供可回滾 migration
- 三個 change 的 spec / design 出現互相衝突的 SHALL / Requirement，需要你自行裁決優先級

**Done when（全部完成後）：**
1. tasks.md 全部打勾，且最終 summary 逐條列出 task → 修改檔案 → 驗證方式
2. 每條 Requirement / SHALL 都對應到至少一個通過的 server test、web test、或可重現的手動驗證
3. pnpm --filter @solar-display/server test 退出碼 0，並貼上 test summary
4. pnpm run build 退出碼 0，並貼上 build summary
5. git diff --name-only 只包含本 goal scope 內檔案與其直接新增檔案
6. 最終 summary 明確列出 draft/live config shape、publish / rollback API、validation findings JSON shape
