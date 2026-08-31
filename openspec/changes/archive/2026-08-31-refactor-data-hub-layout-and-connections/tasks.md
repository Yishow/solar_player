## 1. 重構 Connections 連線頁面與模組化拆分

- [x] 1.1 實作全新的 Broker 連線表單元件 `BrokerForm.tsx`，支援模擬資料與真實 Broker 模式切換及完整連線參數輸入；透過單元測試驗證表單狀態變更與欄位驗證 (`pnpm --filter @solar-display/web test BrokerForm`)。
- [x] 1.2 [P] 實作連線健康度與診斷卡片 `ConnectionStatusCard.tsx`，呈現即時狀態燈號、測試結果反饋與快速維運導引；透過單元測試驗證各種連線狀態的樣式與文字渲染 (`pnpm --filter @solar-display/web test ConnectionStatusCard`)。
- [x] 1.3 整合 `ConnectionsView.tsx` 為流動式雙欄響應式佈局（符合 `Data Hub Connections surface presents a fluid two-column layout for Broker configuration and health diagnostics` 與 `廢棄舊版寫死絕對定位與引入流動式雙欄佈局`），並將頂部操作按鈕整合至標準工具列；透過測試驗證連線測試與儲存行為 (`pnpm --filter @solar-display/web test MqttSettings`)。
- [x] 1.4 確保所有新建立的連線元件與重構後的入口檔案皆符合單一職責與行數限制（符合 `MQTT management components are structured into modular units under 400 lines` 與 `模組化拆分巨型元件至 400 行以內`）；透過檔案行數檢查指令確認各檔案不超過 400 行。

## 2. 統一 Data Hub 視覺層級與子頁面佈局

- [x] 2.1 重構 Data Hub 外層 `DataHub/index.tsx` 與子頁面標題結構（符合 `Data Hub provides unified fluid shell layout without redundant sub-page headers` 與 `精簡頁面標題層級與統一操作列`），由 `PageScaffold` 統一大標題與分頁導覽列，消除各子頁面重複的 `<h2>` 或次級標題；透過測試驗證導覽與分頁渲染 (`pnpm --filter @solar-display/web test DataHub`)。
- [x] 2.2 [P] 調整 `Sources.tsx`、`Metrics.tsx`、`DerivedMetrics.tsx`、`Usage.tsx`、`Diagnostics.tsx` 與 `Weather.tsx` 的頂部工具列與邊距，統一採用流動式 Card 與 Flexbox/Grid 容器；透過前端測試驗證各子分頁渲染與互動行為正常 (`pnpm --filter @solar-display/web test pages/DataHub`)。

## 3. 現代化 Sources 維運介面與清理舊版樣式

- [x] 3.1 拆分並重構 Topic 映射維運元件 `TopicOperationsView.tsx` 與卡片資料覆寫元件 `CardDataOperationsView.tsx`（符合 `MQTT operations and topic workspace adopt fluid responsive card layout`），支援流動表格、數值發佈測試與覆寫操作；透過測試驗證 Topic 與卡片資料覆寫維運流程 (`pnpm --filter @solar-display/web test TopicWorkspace`)。
- [x] 3.2 清理 `mqttSettings.css`，移除所有舊版 FHD 絕對定位座標（`top: 118px`、`left: 1340px`、`width: 1198px` 等），將通用樣式現代化；透過樣式檢查與視覺驗證確認無殘留絕對定位規則。

## 4. 驗證與回歸測試

- [x] 4.1 執行全量前端測試套件，驗證所有 Data Hub 與 MQTT 相關之 1358+ 個測試案例 100% 綠燈通過 (`pnpm --filter @solar-display/web test`)。
- [x] 4.2 執行全專案閘道驗證 `pnpm verify`，確保 TypeScript 型別檢查、Linter 與全端測試均無任何回歸錯誤。
