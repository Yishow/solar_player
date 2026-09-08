# Design｜將換算係數與資料維運作業整合至 Data Hub

## Context

在 commit 8323c33c 引入 Data Hub 任務工作區重構（U1）並將舊網址 /settings/data-source 轉址後，原本「資料來源」頁面所持有的關鍵功能——包含換算係數設定（CalculationSettings：碳排放係數、植樹係數、家庭用電度數、預估電價）、趨勢重設（resetTodayTrend / resetMonthTrend）與資料庫診斷——未在 Data Hub 介面中提供可見入口，造成使用者無法在管理介面上調整綠能減碳與經濟效益換算參數。

## Goals / Non-Goals

**Goals:**
- 在 Data Hub 中提供可見的換算係數（CalculationSettings）檢視與調整入口，並清楚標註為「全系統共用參數」。
- 提供受控的今日趨勢（resetTodayTrend）與當月趨勢（resetMonthTrend）重設操作與資料庫診斷狀態展示。
- 解除 dataHubCompatibility.ts 對 diagnostics/operations 的阻斷性自轉址，確保路由 /settings/data-hub/diagnostics/operations 正常載入 DataSourceOperations。
- 補齊路由導航、頁面渲染與相容轉址的自動化單元測試。

**Non-Goals:**
- 不修改後端 calculationSettings API 資料結構、驗證邏輯與 SQLite 存儲。
- 不調整 Overview、Solar、Sustainability 等展示端的換算計算公式。
- 不針對單一廠區（CL/KN）分裂獨立的碳排與植樹換算係數。

## Decisions

### D1. 維運頁籤與直達入口
在 Data Hub 的「可用數據 (Metrics)」頁面提供「進階維運／換算係數」的直接操作入口，並且在路由系統中讓 `/settings/data-hub/diagnostics/operations` 正常載入 DataSourceOperations 元件，提供完整的換算係數表單與趨勢重設介面。

### D2. 相容轉址收斂
修正 dataHubCompatibility.ts：
1. 移除 `[/settings/data-hub/diagnostics/operations, /settings/data-hub/sources]` 的無效自轉址，允許直接進入維運操作頁。
2. 調整 /settings/data-source 轉址策略：當帶有 operations 或無特定 metricKey 時，提供正確導航至可用數據與維運功能。

### D3. 全域參數與廠區範圍辨識
換算係數（碳排係數、植樹係數、家庭用電度數、預估電價）為全系統共用（Global）。介面須繼承既有 OpsSurface 與 OpsInfoBanner，清楚標明「調整後會同步影響 Overview / Solar / Sustainability 的減碳、植樹與四口之家換算」，避免操作員誤以為僅變更單一廠區。

## Implementation Contract

- **Behavior**：
  - 管理者在 Data Hub「可用數據 (Metrics)」或直接進入 `/settings/data-hub/diagnostics/operations` 時，可看見並編輯換算係數（碳排係數、植樹係數、家庭日/月用電度數、預估電價），保存成功後能即時反應。
  - 管理者可在維運介面中執行今日與當月監控趨勢重設，並獲得即時狀態反饋。
- **Interface / Data Shape**：
  - 沿用既有 `CalculationSettings` 介面：`carbonEmissionFactor`、`treeEquivalentFactor`、`householdDailyUsageKwh`、`householdMonthlyUsageKwh`、`estimatedTariffPerKwh`、`co2AutoConvertSmallToKg`。
  - 沿用既有後端 API：`GET /api/settings/calculation`、`PUT /api/settings/calculation`、`POST /api/metrics/reset-today`、`POST /api/metrics/reset-month`。
- **Failure Modes**：
  - 網路或伺服器錯誤時顯示明確的錯誤訊息橫幅，不清除使用者已輸入的草稿。
  - 數值格式錯誤（非數字或負數）於送出前阻擋並提示。
- **Acceptance Criteria**：
  - `pnpm --filter @solar-display/web test` 通過所有 router、dataHubCompatibility 與 DataSourceOperations 測試。
  - `pnpm verify` 全階段通過。
- **Scope Boundaries**：
  - 僅限 Data Hub 介面導航、相容轉址修正與 DataSourceOperations 整合，不擴散至展示端繪圖或 MQTT 核心協定。

## Risks / Trade-offs

- **[Risk] 舊書籤相容性中斷** → 保留 `/settings/data-source` 的轉址能力，精確導流至可用數據或維運介面。
- **[Risk] 全域係數與廠區 scope 混淆** → 在維運頁面上使用顯著橫幅與 SharedInfrastructureBanner 說明全域共用屬性。
