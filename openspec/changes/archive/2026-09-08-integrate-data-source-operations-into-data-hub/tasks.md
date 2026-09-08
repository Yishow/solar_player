# Tasks｜將換算係數與資料維運作業整合至 Data Hub

## 1. 路由與相容轉址修正

- [x] 1.1 **相容轉址收斂** — 修正 apps/web/src/app/dataHubCompatibility.ts，移除對 /settings/data-hub/diagnostics/operations 的自轉址，確保訪問維運路徑時直接放行至維運頁面，並在 apps/web/src/app/dataHubCompatibility.test.ts 新增斷言驗證。（D2. 相容轉址收斂，Data Hub provides direct access to calculation settings and operational maintenance）
- [x] 1.2 **維運頁籤與直達入口** — 於 apps/web/src/app/router.tsx 確保 /settings/data-hub/diagnostics/operations 路由正常加載 DataSourceOperations，以 apps/web/src/app/router.test.ts 驗證路由可正常解析不拋出例外。（D1. 維運頁籤與直達入口，Data Hub provides direct access to calculation settings and operational maintenance）

## 2. Data Hub 介面整合與驗證

- [x] 2.1 **全域參數與廠區範圍辨識** — 在 Data Hub 可用數據（Metrics.tsx）與工作首頁（TaskHome.tsx）加入「進階維運／換算係數」的直接操作連結與全域共用說明橫幅，使操作員能明確檢視並修改 carbonEmissionFactor 等全域參數，以 pnpm --filter @solar-display/web test 驗證元件渲染。（D3. 全域參數與廠區範圍辨識，Operational maintenance surface preserves global calculation parameters and scoped resets）
- [x] 2.2 **維運表單與趨勢重設整合** — 驗證 DataSourceOperations 在 Data Hub 內部渲染時能正常執行計算參數更新與今日/當月趨勢重設，並由端到端及全量測試 pnpm verify 確保無 regression。（Operational maintenance surface preserves global calculation parameters and scoped resets）

## Closeout Notes

- **相容性與路由修正**：
  - `apps/web/src/app/dataHubCompatibility.ts`：移除 `compatibilityTargets` 中對 `/settings/data-hub/diagnostics/operations` 的阻斷性自轉址。
  - `apps/web/src/app/dataHubCompatibility.test.ts`：新增維運路徑不被轉址的直接放行斷言。
  - `apps/web/src/app/router.tsx`：恢復 `/settings/data-hub/diagnostics/operations` 與 `/settings/data-hub/operations` 正常以 `createLazyManagementRouteLoader` 載入 `DataSourceOperations`（支援 `showTodayReset`）。
  - `apps/web/src/app/router.test.ts`：更新斷言確保路由存在且正常加載維運元件。
- **介面整合**：
  - `apps/web/src/pages/DataHub/Metrics.tsx`：於 header 增加「進階維運／換算係數 →」操作入口連結。
  - `apps/web/src/pages/DataHub/TaskHome.tsx`：於直接開啟專業頁中增加「維運與換算係數」連結。
  - `apps/web/src/pages/DataHub/Metrics.test.tsx` 與 `TaskHome.test.tsx`：增加元件渲染與導航斷言。
- **Gate 驗證**：
  - 單元測試：`pnpm --filter @solar-display/web test` 1440 pass 0 fail。
  - 全量 Gate：`pnpm verify` 7 個 stage 全數通過（exit code 0）。
