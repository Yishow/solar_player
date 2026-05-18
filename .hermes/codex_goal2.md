嚴格按照以下兩個 Spectra changes 完成 Display Editor 完整化：
1. `strengthen-display-editor-canvas-workflow`
2. `add-display-editor-schema-aware-inspector`

**工作目錄：** /Users/yishow/prj/solar_player/

⚠️ 重要：絕對不可修改 AGENTS.md 或 CLAUDE.md 檔案。不可在任何檔案中加入 <claude-mem-context> 或 <codex-mem-context> 區塊。如果發現 AGENTS.md 有未提交變更，立即執行 `git checkout AGENTS.md` 並繼續。

**已讀取檔案（全部逐字讀取）：**
- openspec/changes/strengthen-display-editor-canvas-workflow/proposal.md
- openspec/changes/strengthen-display-editor-canvas-workflow/design.md
- openspec/changes/strengthen-display-editor-canvas-workflow/tasks.md
- openspec/changes/strengthen-display-editor-canvas-workflow/specs/display-editor-canvas-manipulation/spec.md
- openspec/changes/strengthen-display-editor-canvas-workflow/specs/display-editor-region-navigation/spec.md
- openspec/changes/strengthen-display-editor-canvas-workflow/specs/display-editor-layout-reuse/spec.md
- openspec/changes/add-display-editor-schema-aware-inspector/proposal.md
- openspec/changes/add-display-editor-schema-aware-inspector/design.md
- openspec/changes/add-display-editor-schema-aware-inspector/tasks.md
- openspec/changes/add-display-editor-schema-aware-inspector/specs/display-editor-typed-inspector-controls/spec.md
- openspec/changes/add-display-editor-schema-aware-inspector/specs/display-editor-reset-and-diff-tools/spec.md
- openspec/changes/add-display-editor-schema-aware-inspector/specs/display-editor-region-presets/spec.md

**Proposal 摘要：**
- **Change 1 (Canvas Workflow)：** 補齊拖曳、縮放、鍵盤微移、zoom/pan、snap guides；region tree、鎖定、快速定位；layout reuse（reset、copy/paste geometry、undo/redo per page session）。
- **Change 2 (Schema-Aware Inspector)：** 建立 schema-aware inspector（text, number, toggle, select, array, asset reference）；reset and diff tools（field-level dirty 與 seed/live 差異提示）；region presets（相容性限制套用）。

**Implementation Contracts：**
- **Change 1：** 可直接拖曳/縮放 editable regions，鍵盤微移；region tree 與畫布選取同步，鎖定/選取分離；undo/redo session history 不立即寫 server。
- **Change 2：** inspector 依 schema 渲染欄位；顯示約束錯誤、seed 差異、reset 動作；相容 region 套用 preset；未知欄位安全 fallback。

**實作範圍（僅限此 goal 直接要求的檔案）：**
- apps/web/src/pages/DisplayPagesEditor/index.tsx
- apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts（新）
- apps/web/src/pages/DisplayPagesEditor/regionTree.tsx（新）
- apps/web/src/pages/DisplayPagesEditor/history.ts（新）
- apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx（新）
- apps/web/src/pages/DisplayPagesEditor/presets.ts（新）
- apps/web/src/pages/DisplayPagesEditor/runtime.tsx
- apps/web/src/hooks/useDisplayEditor.ts
- apps/web/src/hooks/useDisplayPageConfig.ts
- apps/web/src/pages/*/displayPageConfig.ts（各頁的 editor config 定義）
- packages/shared/src/displayEditorSchema.ts（新）
- 測試檔案

**Constraints（嚴格遵守）：**
- 只做 editor route 與其直接依賴；不要順手重做正式 playback 頁內容。
- 不修改 AGENTS.md、CLAUDE.md、deploy/、server route、DB migration，除非 spec 明確要求且先停下回報。
- 不引入新依賴；package.json、lockfile 不得變更。
- 正式 playback routes 仍不得進入 editor mode。
- Existing tests start failing — this is a regression, do not fix by editing tests, adding `.skip`, or weakening assertions.
- 所有 .ts / .tsx 檔案不得超過 400 行。

**Tasks（12 個 task，全部需完成並打勾 tasks.md）：**

**Change 1 Tasks:**
Task 1.1: Manipulate display editor geometry directly on canvas — drag and resize for editable regions. Verified by interaction tests + manual `/display-pages/editor` verification.

Task 1.2: Support zoom, pan, and keyboard nudge — viewport controls and keyboard nudging. Verified by web test on interaction reducers/hooks + manual checks.

Task 2.1: Keep region navigation separate from visual overlay — region tree syncs with canvas selection. Verified by targeted web tests for selection sync.

Task 2.2: Support locked regions — preventing direct manipulation on locked regions while keeping them selectable. Verified by interaction tests.

Task 3.1: Reuse layout adjustments — reset and copy-and-paste geometry actions. Verified by manual editor checks and targeted reducer tests.

Task 3.2: Persist editor history per page session — undo and redo stacks for unsaved changes. Verified by targeted web tests covering undo/redo behavior.

**Change 2 Tasks:**
Task 1.1: Describe region fields with a schema-aware inspector contract — reusable field-schema definitions and typed inspector rendering. Verified by web tests for mixed field types.

Task 1.2: Enforce typed inspector constraints — surfacing invalid ranges, required values, compatibility errors. Verified by web tests.

Task 2.1: Compute reset and diff tools against seed and current draft — marking dirty fields and allowing field/region reset. Verified by web test covering dirty-state and reset.

Task 2.2: Keep reset and diff tools scoped to current page draft — reset only affects active draft page unless broadened. Verified by hook/component tests.

Task 3.1: Keep region presets opt-in and scoped by compatibility — define preset compatibility rules and apply actions. Verified by inspector tests.

Task 3.2: Surface incompatible presets before overwrite — blocking/flagging incompatible presets without mutating content. Verified by web tests for preset selection failures.

**每完成 1 個 task：**
1. Code review
2. Fix bugs
3. Commit with zh-tw（Traditional Chinese）
4. 確認 AGENTS.md 未變更（如有變更執行 git checkout AGENTS.md）

**Stop if：**
- 需要新增 server API、DB migration、或修改正式 playback route 結構才能繼續。
- package.json、lockfile、AGENTS.md、CLAUDE.md、deploy/ 出現在 git diff。
- 現有 web 測試開始失敗，或任何測試靠 `.skip` / disabled 才通過。
- schema 設計需要一次性重寫所有 display page config shape，而不只是 editor-facing schema。
- 任何 spec 要求與本 goal scope 外的 publishing / asset governance / rotation contract 互相衝突。

**Done when：**
1. 兩個 change 的 tasks.md 全部打勾，summary 逐條列出 task → 檔案 → 驗證。
2. 六份 spec.md 的每條 Requirement 都有對應測試或手動驗證證據。
3. pnpm --filter @solar-display/web test -- src/hooks/useDisplayEditor.test.ts src/hooks/useDisplayPageConfig.test.ts src/pages/DisplayPagesEditor/index.test.tsx 退出碼 0，並貼上 summary。
4. 新增或更新的 interaction reducer / history / preset / schema-aware inspector 測試都被點名列在最終 summary。
5. pnpm run build 退出碼 0，並貼上 build summary。
6. 手動驗證清單包含：drag / resize、zoom / pan、keyboard nudge、region tree、lock、reset、copy-paste geometry、undo / redo、typed inspector、field reset、preset compatibility。
7. git diff --name-only 只包含 editor scope 與其直接新增檔案。
