# E6｜建立每廠區總用電、部門來源與占比基準設定

## Why

使用者需要在UI明確定義每個廠區的分子／分母，不是閱讀公式後自行尋找底層設定。總用電與占比基準應是單一、可共用且可追蹤的設定。

## What Changes

定義可實作的資料契約、唯一設定來源、具體UI入口與驗收情境。使用者不必編寫分子／分母公式、填metric key或閱讀系統操作手冊才能完成一般設定。siteTotal、departments、shareBasis 與 siteTimeZone 由 E6 profile 單一保存；E1 source 只保存物理來源、measurement semantics 與 energyFlowRole，不保存 site-main/department 或 departmentId。

2026-09-07 補充：preview/apply 自動綁定及檢查既有 E1 source revisions 與計算設定；操作員不需填版本號。來源衝突時保留選擇並重新預覽，不新增設定步驟。

## Non-Goals

不實作任意算式編輯器、不猜測未提供的現場電錶關係、不把資料完整性與設定完成混為一談、不偷偷改正式頁面或重算歷史。不在 E1 source definition 重複保存 accounting ownership 或 calendar authority；不讓 caller timezone override 改寫 profile 的 day/month/year 邊界。

## Capabilities

### New Capabilities

- `site-energy-accounting-profiles`：本change的限定契約，依同目錄specs。

### Modified Capabilities

- 無；對其他草案的整合要求另以其需求與tasks追蹤。

## Dependencies and Delivery Boundary

前置：E1 / add-meter-reading-contracts；E2 / fix-period-consumption-deltas 消費本 profile 的 membership 與 siteTimeZone。E1 僅提供物理來源、measurement kind、energyFlowRole 與 normalized source timestamp；E6 是 site accounting ownership 與 calendar boundary 的唯一 authority。E6 API 可注入 E2 calculator seam 做數值預覽，但不得反向造成 E6 對 E2 runtime 的依賴。
本文件仍為待實作提案；沒有推送GitHub、實作或部署。本次已執行 Spectra 文件驗證，應用程式測試與現場驗收仍未執行。

## Impact

Existing integration files（依main查核的整合點，apply前重核）：
- `apps/web/src/pages/CircuitSettings/index.tsx`
- `apps/web/src/pages/CircuitSettings/CircuitRow.tsx`
- `packages/shared/src/index.ts`

Proposed new implementation files（尚未建立的應用程式檔，不是本包已實作）：
- `packages/shared/src/siteEnergyProfile.ts`
- `apps/server/src/services/siteEnergyProfileService.ts`
- `apps/server/src/routes/site-energy-profile.ts`
- `apps/server/src/services/siteEnergyProfileService.test.ts`
- E6 profile revision lookup：提供 siteTimeZone、siteTotal、department membership 與 shareBasis 給 E2 period resolver；source timestamp parsing 與 source revision/baseline 仍由 E1 管理。

## V3 MQTT Source Integration

新增E6-R10：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。
