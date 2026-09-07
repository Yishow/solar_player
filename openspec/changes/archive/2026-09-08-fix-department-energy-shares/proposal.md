# E5｜用同期間真實電量計算部門用電百分比

## Why

部門用電占比應由量測得到，不能維持固定25%、20%等示意值，也不能把累積電量與瞬時功率相除。

## Problem and Evidence

FactoryCircuit/viewModel 的 slotDefinitions 提供固定25/20/15/15/10/5/5/5，healthy story path 與 fallback path 都把 slot.sharePercent 直接當 sharePercent。卡片目前另有 livePowerKw/utilizationPercent，兩者不是期間用電占比。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

在服務端計算同廠區、同期間、同量測種類的部門電量及分母；透過 story contract 傳給前端。預設展示今日用電占比，允許在 editor 選月/年；既有即時kW欄位保持功率語意。

## Non-Goals

不推估沒有子錶的部門、不自動把所有部門加總當全廠、不強制讓資料不足時仍加到100%，不把 ratedCapacity利用率當部門用電占比。

## Capabilities

### New Capabilities

- `department-energy-shares`：用同期間真實電量計算部門用電百分比；具體規則與例外見同目錄 specs。

### Modified Capabilities

- 無；本 change 以新增的限定能力補充既有契約，不刪除既有權限、版位與相容性約束。

## Dependencies and Delivery Boundary

- 類型：Bug Fix。
- 優先序：P0。
- 前置 change：E1 / add-meter-reading-contracts、E2 / fix-period-consumption-deltas、E3 / repair-consumption-history-projections、E6 / add-site-energy-accounting-profiles。
- 可先評審草案；只有前置契約及對應驗證完成後才可以進入相依實作。
- 本 change 以自己的 tasks 作實作進度來源；其他 change 未完成不能靠此 change 臨時 hardcode 代替。

## Success Criteria

- 每一個 requirement 的 GIVEN / WHEN / THEN 必須由 test-plan 指定的驗證層實際驗證。
- 失敗狀態、權限與跨廠區隔離和正常狀態同為交付條件。
- 保存來源或草稿不代表發布；伺服器發布不代表裝置已套用。
- 所有實作 task、受影響測試、實際 pnpm verify 及必要人工驗收完成後才可 archive。

## Impact

- Existing files to modify（基準路徑／整合點，實作前須依最新 main 再確認）：
  - `packages/shared/src/displayStory.ts`
  - `apps/server/src/services/displayStoryService.ts`
  - `apps/web/src/pages/FactoryCircuit/viewModel.ts`
  - `apps/web/src/pages/FactoryCircuit/displayPageConfig.ts`
  - `apps/web/src/pages/FactoryCircuit/viewModel.test.ts`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `apps/server/src/services/departmentEnergyShareService.ts`
  - `apps/server/src/services/departmentEnergyShareService.test.ts`
  - `packages/shared/src/departmentEnergyShare.ts`
- Removed: 無。
- Specification artifacts: `openspec/changes/fix-department-energy-shares/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V2 Revision

補上E5-R8，由E6持有廠區總量/部門来源/比較基準，U6提供四步及日常捷徑。不再要求使用者自行跨頁拼湊設定或編寫公式。
