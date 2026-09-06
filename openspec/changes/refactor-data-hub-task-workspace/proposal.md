# U1｜把 DataHub 整理成任務入口與一致廠區工作區

## Why

目前四個分類偏系統架構，使用者仍要自行決定連線、來源、指標及展示之間的操作順序。本 change 建立可搜尋、可排查、可明確辨識scope的工作首頁，不再只排一列技術分頁。

## Problem and Evidence

DataHub/index 提供all/cl/kn/global管理scope；Sources新增mapping卻固定cl，source內容與上方scope未透過同一state model約束。Connections已有status/test/save；應保留而不是重寫broker。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

保留現有四個專業頁與相容網址，增加任務首頁「接入新資料／修改現有資料／排除資料異常」。建立共用scope模型、摘要列表與詳細編輯抽屜，工程細節只在需要時展開。

## Non-Goals

不重建MQTT broker、不增加每廠區broker、不加入任意新資料協定、不在UI重算用電、不重寫展示頁外觀；不拿management scope取代binding scope或preview context。

## Capabilities

### New Capabilities

- `data-hub-task-workspace`：把 DataHub 整理成任務入口與一致廠區工作區；具體規則與例外見同目錄 specs。

### Modified Capabilities

- `data-hub-management-surface`：以本 change 的 MODIFIED delta 更新既有完整 requirement，保留未涉及行為。

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
  - `apps/web/src/pages/DataHub/index.tsx`
  - `apps/web/src/pages/DataHub/Sources.tsx`
  - `apps/web/src/pages/DataHub/SourceCards.tsx`
  - `apps/web/src/pages/DataHub/Metrics.tsx`
  - `apps/web/src/app/dataHub.ts`
  - `apps/web/src/app/dataHubCompatibility.ts`
  - `apps/web/src/app/router.tsx`
  - `apps/web/src/app/routeMeta.ts`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `apps/web/src/pages/DataHub/TaskHome.tsx`
  - `apps/web/src/pages/DataHub/workspaceContext.ts`
  - `apps/web/src/pages/DataHub/workspaceContext.test.ts`
- Removed: 無。
- Specification artifacts: `openspec/changes/refactor-data-hub-task-workspace/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V2 Revision

補上U1-R7，由E6持有廠區總量/部門来源/比較基準，U6提供四步及日常捷徑。不再要求使用者自行跨頁拼湊設定或編寫公式。

## V3 MQTT Source Integration

新增U1-R8：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。
