# U5｜集中草稿保存、影響檢查與安全發布

## Why

發布動作和驗證結果分散，使用者容易分不清草稿已保存、伺服器已發布與裝置已套用。需要集中工作流程與明確revision防護，而不是把所有按鈕改成一顆模糊的「完成」。

## Problem and Evidence

regionTree包含save/publish動作，publishingStatus顯示另一組validation/fallback；existing hooks與publishing service已有版本/草稿機制，本change要求沿用並補足整體流程，不從UI聲稱裝置收到即等於套用。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

「檢查並發布」導向一個集中抽屜：先保存確定草稿、建立精確版本preflight、顯示差異與影響、定位修復，使用者確認後才發布；server於寫入前再次驗證版本与阻擋條件。

## Non-Goals

不自動發布所有頁、不新增分散式全站交易、不透過一次page save包辦broker/source/shell變更、不因装置online就宣稱applied、不跳過人工FHD acceptance。

## Capabilities

### New Capabilities

- `display-publish-preflight`：集中草稿保存、影響檢查與安全發布；具體規則與例外見同目錄 specs。

### Modified Capabilities

- 無；本 change 以新增的限定能力補充既有契約，不刪除既有權限、版位與相容性約束。

## Dependencies and Delivery Boundary

- 類型：Feature / Enhancement。
- 優先序：P1。
- 前置 change：U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace、U4 / add-unsaved-binding-preview。
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
  - `apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx`
  - `apps/web/src/pages/DisplayPagesEditor/publishing.ts`
  - `apps/server/src/services/displayPagePublishingService.ts`
  - `apps/server/src/routes/display-pages.ts`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `packages/shared/src/displayPublishPreflight.ts`
  - `apps/server/src/services/displayPublishPreflightService.ts`
  - `apps/server/src/services/displayPublishPreflightService.test.ts`
  - `apps/web/src/pages/DisplayPagesEditor/PublishReviewDrawer.tsx`
  - `apps/web/src/pages/DisplayPagesEditor/publishReviewState.test.ts`
- Removed: 無。
- Specification artifacts: `openspec/changes/unify-display-publish-preflight/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V2 Revision

補上U5-R7，由E6持有廠區總量/部門来源/比較基準，U6提供四步及日常捷徑。不再要求使用者自行跨頁拼湊設定或編寫公式。
