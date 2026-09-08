# Q1｜整合用電正確性、資料接入、展示發布與回退驗收

## Why

多個change分開完成不代表整套流程能用。需要以同一批資料走過MQTT→差值→history→月圖/部門比例→editor→publish，避免每個畫面各算一套或只在mock下通過。

## Problem and Evidence

repo要求pnpm verify、fresh FHD witness、使用者視覺acceptance後才可archive；自動測試或舊截圖不是部署與上線驗收。此change只負責跨領域驗證与交接，不吞入其他change的功能實作。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

建立可重現CL/KN、日/月/年、reset/gap、zero/stale、UI/發布/並行修改的整合fixtures与journey tests；交付逐項證據、修復清單、部署回退runbook与source-to-screen對帳。

## Non-Goals

不取代前10個change的unit tests，不把未驗證的功能標完成，不做未授權生产重算或發布，不用mock填補生產歷史。

## Capabilities

### New Capabilities

- `energy-authoring-acceptance`：整合用電正確性、資料接入、展示發布與回退驗收；具體規則與例外見同目錄 specs。

### Modified Capabilities

- 無；本 change 以新增的限定能力補充既有契約，不刪除既有權限、版位與相容性約束。

## Dependencies and Delivery Boundary

- 類型：Feature / verification gate。
- 優先序：P1 / release gate。
- 前置 change：E4 / fix-overview-monthly-consumption、E5 / fix-department-energy-shares、E6 / add-site-energy-accounting-profiles、U1 / refactor-data-hub-task-workspace、U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace、U4 / add-unsaved-binding-preview、U5 / unify-display-publish-preflight、U6 / add-guided-site-energy-setup。
- 可先評審草案；只有前置契約及對應驗證完成後才可以進入相依實作。
- 本 change 以自己的 tasks 作實作進度來源；其他 change 未完成不能靠此 change 臨時 hardcode 代替。

## Success Criteria

- 每一個 requirement 的 GIVEN / WHEN / THEN 必須由 test-plan 指定的驗證層實際驗證。
- 失敗狀態、權限與跨廠區隔離和正常狀態同為交付條件。
- 保存來源或草稿不代表發布；伺服器發布不代表裝置已套用。
- 所有實作 task、受影響測試、實際 pnpm verify 及必要人工驗收完成後才可 archive。

## Impact

- Existing files to modify（基準路徑／整合點，實作前須依最新 main 再確認）：
  - `playwright.config.ts`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `tests/energy-authoring-journeys.spec.ts`
  - `tests/fixtures/energy-authoring-readings.json`
  - `docs/runbooks/energy-authoring-rollout.md`
- Removed: 無。
- Specification artifacts: `openspec/changes/verify-energy-authoring-journeys/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V2 Revision

補上Q1-R6，由E6持有廠區總量/部門来源/比較基準，U6提供四步及日常捷徑。不再要求使用者自行跨頁拼湊設定或編寫公式。

## V3 MQTT Source Integration

新增Q1-R7：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。

## V3 Dependency Authority

目前前置（取代上方舊版列表）：E4, E5, E6, U1, U2, U3, U4, U5, U6, M1, M2。依本段列出的 change dependency 為準；E1/E6不反向依賴UI以避免循環。
