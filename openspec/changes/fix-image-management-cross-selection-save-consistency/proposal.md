## Problem

`/settings/images` 目前把 dirty 狀態做成整頁層級，但儲存路徑只會落盤「目前 selected 的 image asset」與其排序最前的 playlist row。操作員若先修改圖片 A，再切到圖片 B 後直接儲存，A 的未儲存修改會被靜默遺失，這讓圖片治理頁成為有資料遺失風險的管理面。

## Root Cause

`Image Management` 缺少 selection-scoped draft 邊界。選取切換不會阻擋、提示或暫存上一個 asset 的修改，而 save pipeline 也沒有針對多筆待儲存編輯建立明確的持久化契約。

## Proposed Solution

- 讓 `Image Management` 在 asset selection change 時維持明確的 draft safety：要嘛阻擋/提示切換，要嘛保留並可回復該 asset 的待儲存修改，但不得靜默丟失。
- 讓 save path 與 dirty state 對齊同一個 selected asset / playlist entry contract，避免 UI 顯示已修改卻只部分持久化。
- 補上對 asset-level 欄位與 playlist-level 欄位的 cross-selection regression 驗證，確認切換、儲存、重新同步三段行為一致。

## Success Criteria

- 操作員在 `/settings/images` 修改圖片 A 後切到圖片 B 時，系統會明確保留、提示、或要求處理 A 的未儲存修改，而不是靜默遺失。
- 儲存行為只會在可解釋的 selection contract 下完成，畫面上的 dirty state、成功訊息與實際持久化結果一致。
- 相關 regression tests 可覆蓋 asset-level 與 playlist-level 欄位的 cross-selection save flow。

## Impact

- Affected code:
  - Modified: `apps/web/src/pages/ImageManagement/index.tsx`
  - Modified: `apps/web/src/pages/ImageManagement/ImageManagementContent.tsx`
  - Modified: `apps/web/src/pages/ImageManagement/viewModel.ts`
  - Modified: `apps/web/src/pages/ImageManagement/index.test.tsx`
  - Modified: `apps/web/src/pages/ImageManagement/viewModel.test.ts`
  - Modified: `apps/web/src/hooks/displaySyncDraftGuard.ts`
  - Modified: `apps/web/src/services/api.ts`

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `image-management-display-reference-integration`: 將 Image Management 的治理契約補齊為 selection-safe 的 asset / playlist 編輯流程，避免切換選取時遺失未儲存修改。
