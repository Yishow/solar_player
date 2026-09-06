# U4｜未儲存綁定即時預覽、資料挑選與來源到展示接續

## Why

目前資料預覽讀已保存stage，換綁定後要先存草稿才能刷新。操作員需要先驗證自己正在改的內容，而不是為了看效果先存一份尚未確認的設定。

## Problem and Evidence

displayDataPreviewService 的readPreviewRequest只接受context/stage，binding plan由readStageConfig取得；dataInspector明確提示未儲存時需先存。既有compileEffectiveBindingPlan與catalog授權應共用，不能在browser另外繞過。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

新增授權的唯讀 ephemeral preview，接受當前草稿binding/config與preview context，在記憶體驗證並套用相同compiler/resolver；資料picker顯示中文名、scope、單位、值、freshness與相容原因，並承接U2的source identity。

## Non-Goals

不儲存、不發布、不寫live metric、不更改裝置scope、不允許任意expression/script；不因預覽而降低既有binding constraints，也不讓raw counter塞入period-energy欄位。

## Capabilities

### New Capabilities

- `unsaved-binding-preview`：未儲存綁定即時預覽、資料挑選與來源到展示接續；具體規則與例外見同目錄 specs。

### Modified Capabilities

- 無；本 change 以新增的限定能力補充既有契約，不刪除既有權限、版位與相容性約束。

## Dependencies and Delivery Boundary

- 類型：Feature。
- 優先序：P1。
- 前置 change：E3 / repair-consumption-history-projections、U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace。
- 可先評審草案；只有前置契約及對應驗證完成後才可以進入相依實作。
- 本 change 以自己的 tasks 作實作進度來源；其他 change 未完成不能靠此 change 臨時 hardcode 代替。

## Success Criteria

- 每一個 requirement 的 GIVEN / WHEN / THEN 必須由 test-plan 指定的驗證層實際驗證。
- 失敗狀態、權限與跨廠區隔離和正常狀態同為交付條件。
- 保存來源或草稿不代表發布；伺服器發布不代表裝置已套用。
- 所有實作 task、受影響測試、實際 pnpm verify 及必要人工驗收完成後才可 archive。

## Impact

- Existing files to modify（基準路徑／整合點，實作前須依最新 main 再確認）：
  - `apps/server/src/services/displayDataPreviewService.ts`
  - `apps/server/src/routes/display-pages.ts`
  - `apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx`
  - `apps/web/src/pages/DisplayPagesEditor/index.tsx`
  - `apps/web/src/pages/DataHub/links.ts`
  - `apps/web/src/services/api.ts`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `apps/web/src/pages/DisplayPagesEditor/MetricPicker.tsx`
  - `apps/web/src/pages/DisplayPagesEditor/ephemeralPreviewState.ts`
  - `apps/web/src/pages/DisplayPagesEditor/ephemeralPreviewState.test.ts`
  - `apps/server/src/services/ephemeralDisplayPreviewService.ts`
  - `apps/server/src/services/ephemeralDisplayPreviewService.test.ts`
- Removed: 無。
- Specification artifacts: `openspec/changes/add-unsaved-binding-preview/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V2 Revision

補上U4-R8，由E6持有廠區總量/部門来源/比較基準，U6提供四步及日常捷徑。不再要求使用者自行跨頁拼湊設定或編寫公式。
