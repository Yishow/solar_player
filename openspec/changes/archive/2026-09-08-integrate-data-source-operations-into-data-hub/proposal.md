# Proposal｜將換算係數與資料維運作業整合至 Data Hub

## Why

在 commit 8323c33c 引入 Data Hub 任務工作區重構（U1）並將舊網址 /settings/data-source 轉址後，原本「資料來源」頁面所持有的關鍵功能——包含換算係數設定（CalculationSettings：碳排放係數、植樹係數、家庭用電度數、預估電價）、趨勢重設（resetTodayTrend / resetMonthTrend）與資料庫診斷——未在 Data Hub 介面中提供可見入口，造成使用者無法在管理介面上調整綠能減碳與經濟效益換算參數。本變更將上述維運與換算能力正式整合進 Data Hub 工作區，恢復完整的操作閉環。

## What Changes

- **整合換算係數至 Data Hub**：在 Data Hub「可用數據 (Metrics)」或專屬維運區塊中，提供換算係數（碳排係數、植樹係數、家庭日/月用電度數、預估電價）檢視與編輯表單，並清楚標示為「全系統共用參數」。
- **整合趨勢重設與維運診斷**：提供重設今日/當月監控趨勢曲線與資料庫儲存狀態檢視的受控操作介面。
- **修復相容轉址與路由配置**：解除 dataHubCompatibility.ts 對 diagnostics/operations 的阻斷性自轉址，確保透過 Data Hub 或相容網址均能正常開啟維運作業。
- **補全工作首頁與導覽入口**：在 Data Hub 任務首頁或可用數據區域提供直達換算係數維運的操作捷徑。

## Non-Goals

- 不更改後端計算設定 API（getCalculationSettings、updateCalculationSettings）的資料格式或資料庫欄位結構。
- 不更改 Overview、Solar、Sustainability 等展示頁面的消費端換算邏輯。
- 不在個別廠區（CL/KN）私自拆分獨立的碳排係數，維持全系統單一基準換算規則。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `data-hub-task-workspace`：在 Data Hub 任務工作區與專門分頁中，納入換算係數設定與進階資料維運的入口與狀態展示。
- `data-hub-management-surface`：定義 Data Hub 管理介面承接換算係數（CalculationSettings）與監控重設操作的 UI 契約與相容性行為。

## Impact

- apps/web/src/app/dataHub.ts：更新 Data Hub 分頁或維運區塊定義。
- apps/web/src/app/dataHubCompatibility.ts：修正相容轉址邏輯，避免 operations 路由被誤導向。
- apps/web/src/app/router.tsx：確保 /settings/data-hub/diagnostics/operations 或對應維運路徑正常載入元件。
- apps/web/src/pages/DataHub/Metrics.tsx：提供換算係數與維運面板的整合或捷徑按鈕。
- apps/web/src/pages/DataHub/TaskHome.tsx：在工作首頁排查或設定任務中加入換算維運捷徑。
- apps/web/src/pages/DataSourceSettings/：保留並複用現有成熟的 DataSourceOperations 與 viewModel。
