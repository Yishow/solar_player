# U2｜資料接入導引、累積電錶設定與安全測試

## Why

目前新增通用mapping會一次展開大量工程欄位，且測試發佈可能被誤認為本地預覽。導引必須同時讓累積电量的語意正確設定，避免把新介面接回舊錯誤數據。

## Problem and Evidence

Sources/SourceCards已有新增、修改、刪除與真正publish API；新增預設custom.metric、cl、kW及$.value。此change沿用可用協定，只補工作順序、資料驗證與安全保存。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

以「選廠區與來源→確認連線→選數值欄位與量測種類→確認結果並保存」建立可返回、不丟草稿的導引，熟手可走精簡直接編輯。解析測試唯讀，真正MQTT publish獨立且需確認。

## Non-Goals

不增加任意HTTP/Modbus等未支援connector、不允許改managed Solar ownership、不把成功連線誤稱資料已正確；不自動修改正式頁面綁定。

## Capabilities

### New Capabilities

- `guided-data-source-onboarding`：資料接入導引、累積電錶設定與安全測試；具體規則與例外見同目錄 specs。

### Modified Capabilities

- 無；本 change 以新增的限定能力補充既有契約，不刪除既有權限、版位與相容性約束。

## Dependencies and Delivery Boundary

- 類型：Feature。
- 優先序：P1。
- 前置 change：E1 / add-meter-reading-contracts、U1 / refactor-data-hub-task-workspace。
- 可先評審草案；只有前置契約及對應驗證完成後才可以進入相依實作。
- 本 change 以自己的 tasks 作實作進度來源；其他 change 未完成不能靠此 change 臨時 hardcode 代替。

## Success Criteria

- 每一個 requirement 的 GIVEN / WHEN / THEN 必須由 test-plan 指定的驗證層實際驗證。
- 失敗狀態、權限與跨廠區隔離和正常狀態同為交付條件。
- 保存來源或草稿不代表發布；伺服器發布不代表裝置已套用。
- 所有實作 task、受影響測試、實際 pnpm verify 及必要人工驗收完成後才可 archive。

## Impact

- Existing files to modify（基準路徑／整合點，實作前須依最新 main 再確認）：
  - `apps/web/src/pages/DataHub/Sources.tsx`
  - `apps/web/src/pages/DataHub/SourceCards.tsx`
  - `apps/web/src/pages/DataHub/SourcesModel.ts`
  - `apps/server/src/routes/settings-mqtt.ts`
  - `apps/server/src/services/metricUsageService.ts`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `apps/web/src/pages/DataHub/onboarding/SourceWizard.tsx`
  - `apps/web/src/pages/DataHub/onboarding/sourceDraft.ts`
  - `apps/web/src/pages/DataHub/onboarding/sourceDraft.test.ts`
  - `apps/server/src/services/sourceMappingPreviewService.ts`
  - `apps/server/src/services/sourceMappingPreviewService.test.ts`
- Removed: 無。
- Specification artifacts: `openspec/changes/add-guided-data-source-onboarding/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V2 Revision

補上U2-R7，由E6持有廠區總量/部門来源/比較基準，U6提供四步及日常捷徑。不再要求使用者自行跨頁拼湊設定或編寫公式。

## V3 MQTT Source Integration

新增U2-R8：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。

MQTT有既有連線及已批准範圍時，三階段M2任務取代原generic四step UI；source setup orchestration仍由U2，received-data與batch selector由M1/M2，不建兩套精靈。

## V3 Dependency Authority

目前前置（取代上方舊版列表）：E1, U1, M1, M2。依本段列出的 change dependency 為準；E1/E6不反向依賴UI以避免循環。
