# U3｜重整展示編輯工作台、常駐工具列與情境面板

## Why

頁面/工作區/分頁混在一起，save/publish藏在左側操作而發布檢查在右側。畫布與屬性固定窄欄，會讓高頻編輯反覆找入口。

## Problem and Evidence

DisplayPagesEditor/index 使用220px_1fr_260px固定grid；regionTree左側有regions/objects/actions，actions才顯示保存和發布；右側有inspector/data/source/health/publish。現有undo/redo與shared schema應沿用。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

改成清楚頁面選擇＋常駐工具列＋可收合/調寬面板；選到什麼就顯示相關內容、資料與外觀。素材picker在目前context內開啟，共用頁首頁尾明確提示影響範圍。

## Non-Goals

不是任意自由設計器、不增加所有像素可拖、不重寫各頁模板、不刪除原有專業能力、不假裝共享殼層與單頁草稿是同一交易。

## Capabilities

### New Capabilities

- `display-editor-task-workspace`：重整展示編輯工作台、常駐工具列與情境面板；具體規則與例外見同目錄 specs。

### Modified Capabilities

- 無；本 change 以新增的限定能力補充既有契約，不刪除既有權限、版位與相容性約束。

## Dependencies and Delivery Boundary

- 類型：Refactor / Enhancement。
- 優先序：P1。
- 前置 change：無。
- 可先評審草案；只有前置契約及對應驗證完成後才可以進入相依實作。
- 本 change 以自己的 tasks 作實作進度來源；其他 change 未完成不能靠此 change 臨時 hardcode 代替。

## Success Criteria

- 每一個 requirement 的 GIVEN / WHEN / THEN 必須由 test-plan 指定的驗證層實際驗證。
- 失敗狀態、權限與跨廠區隔離和正常狀態同為交付條件。
- 保存來源或草稿不代表發布；伺服器發布不代表裝置已套用。
- 所有實作 task、受影響測試、實際 pnpm verify 及必要人工驗收完成後才可 archive。

## Impact

- Existing files to modify（基準路徑／整合點，實作前須依最新 main 再確認）：
  - `apps/web/src/pages/DisplayPagesEditor/index.tsx`
  - `apps/web/src/pages/DisplayPagesEditor/regionTree.tsx`
  - `apps/web/src/pages/DisplayPagesEditor/canvasPane.tsx`
  - `apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx`
  - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx`
  - `apps/web/src/pages/DisplayPagesEditor/workspaceLayout.ts`
  - `apps/web/src/pages/DisplayPagesEditor/workspaceLayout.test.ts`
- Removed: 無。
- Specification artifacts: `openspec/changes/refactor-display-editor-workspace/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V2 Revision

補上U3-R7，由E6持有廠區總量/部門来源/比較基準，U6提供四步及日常捷徑。不再要求使用者自行跨頁拼湊設定或編寫公式。
