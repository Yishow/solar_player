# U6｜四步廠區用電設定、分子分母選擇與日常任務捷徑

## Why

上一版說明了公式但沒有給使用者完整短UI流程。本change把入口、選項、逐步結果與免讀手冊驗收寫成實作義務。

## What Changes

定義可實作的資料契約、唯一設定來源、具體UI入口與驗收情境。使用者不必編寫分子／分母公式、填metric key或閱讀系統操作手冊才能完成一般設定。

## Non-Goals

不實作任意算式編輯器、不猜測未提供的現場電錶關係、不把資料完整性與設定完成混為一談、不偷偷改正式頁面或重算歷史。

## Capabilities

### New Capabilities

- `guided-site-energy-setup`：本change的限定契約，依同目錄specs。

### Modified Capabilities

- 無；對其他草案的整合要求另以其需求與tasks追蹤。

## Dependencies and Delivery Boundary

前置：E6 / add-site-energy-accounting-profiles、E3 / repair-consumption-history-projections、E4 / fix-overview-monthly-consumption、E5 / fix-department-energy-shares、U1 / refactor-data-hub-task-workspace、U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace、U4 / add-unsaved-binding-preview。
本文件為v2本地提案；沒有推送GitHub、没有實作或部署。原生OpenSpec/Spectra驗證與應用程式測試未執行。

## Impact

Existing integration files（依main查核的整合點，apply前重核）：
- `apps/web/src/app/router.tsx`
- `apps/web/src/app/dataHub.ts`
- `apps/web/src/pages/DataHub/index.tsx`
- `apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx`
- `apps/web/src/pages/DisplayPagesEditor/index.tsx`

Proposed new implementation files（尚未建立的應用程式檔，不是本包已實作）：
- `apps/web/src/pages/DataHub/EnergySetup/index.tsx`
- `apps/web/src/pages/DataHub/EnergySetup/SiteEnergySetup.tsx`
- `apps/web/src/pages/DataHub/EnergySetup/MeterPicker.tsx`
- `apps/web/src/pages/DataHub/EnergySetup/siteEnergySetupModel.ts`
- `apps/web/src/pages/DataHub/EnergySetup/siteEnergySetup.test.tsx`

## V3 MQTT Source Integration

新增U6-R11：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。

## V3 Dependency Authority

目前前置（取代上方舊版列表）：E6, E3, E4, E5, U1, U2, U3, U4, M2。依本段列出的 change dependency 為準；E1/E6不反向依賴UI以避免循環。
