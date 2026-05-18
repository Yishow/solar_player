繼續完成 Goal 2 剩餘所有 tasks。

工作目錄：/Users/yishow/prj/solar_player/

⚠️ 絕對不可修改 AGENTS.md 或 CLAUDE.md。不可加入 <claude-mem-context> 或 <codex-mem-context> 區塊。如發現 AGENTS.md 被修改，立即 git checkout AGENTS.md。

**已完成基礎（已有未暫存變更）：**
- packages/shared/src/displayEditorSchema.ts — editor schema contract
- 各頁 displayPageConfig.ts — editor region schema
- canvasInteractions.ts / history.ts + 測試
- DisplayPagesEditor 已接上基礎 drag/resize、zoom/pan、keyboard nudge scaffolding
- sidebar / canvas / inspector 拆檔，所有 .ts/.tsx ≤400 行

**待完成 Tasks（12 個全部）：**

**Change 1: strengthen-display-editor-canvas-workflow**

Task 1.1: Canvas drag/resize 已有基礎 → 補齊完整交互測試 + commit + 打勾 tasks.md
Task 1.2: Zoom/pan/keyboard nudge 已有 scaffolding → 補齊 reducer tests + commit + 打勾
Task 2.1: Region tree 與 canvas selection sync — 新增 regionTree.tsx 接到 editor，selection sync 測試
Task 2.2: Locked regions — 鎖定狀態不可拖曳/縮放但可選取，interaction tests
Task 3.1: Reset + copy/paste geometry — reducer tests + 接到 UI
Task 3.2: Undo/redo session history — history.ts 已存在，接到 editor + undo/redo tests

**Change 2: add-display-editor-schema-aware-inspector**

Task 1.1: inspectorFields.tsx 已有基礎 → 補齊 typed field rendering tests（text, number, toggle, select, array, asset reference）
Task 1.2: Typed inspector constraints — 無效範圍、必填值、相容性錯誤在 inspector 顯示
Task 2.1: Reset and diff tools — field-level dirty 標記、seed vs draft 差異、field/region reset
Task 2.2: Scoped reset — 只影響當前 draft page，hook/component tests
Task 3.1: Region presets — preset compatibility rules、apply actions、inspector tests
Task 3.2: Incompatible presets — 阻擋/標記不相容 preset、不修改內容、web tests

**Constraints：**
- 不修改 AGENTS.md、CLAUDE.md、deploy/、package.json、lockfile、server routes、DB migration
- 不引入新依賴
- 測試失敗不可用 .skip
- 所有 .ts/.tsx ≤400 行

**執行步驟：**
1. 先 `git add -A && git commit -m "feat: 基礎鋪設 editor canvas workflow 與 schema inspector"` 提交現有基礎
2. 逐 task 實作（1.1→1.2→2.1→2.2→3.1→3.2→1.1→1.2→2.1→2.2→3.1→3.2）
3. 每個 task 完成後：code review、fix bugs、git commit（Traditional Chinese）、更新 tasks.md checkbox
4. 最終驗證：
   - pnpm --filter @solar-display/web test（exit 0）
   - pnpm run build（exit 0）
5. 最終 summary
