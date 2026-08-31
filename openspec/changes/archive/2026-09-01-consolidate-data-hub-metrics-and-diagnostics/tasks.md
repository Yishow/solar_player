## 1. 簡化 Data Hub 導覽列與相容重導向

- [x] 1.1 精簡 `apps/web/src/app/dataHub.ts` 中的 `DATA_HUB_SECTIONS`，將頂部主要分頁收斂為「資料連線 (Connections)」、「資料來源 (Sources)」、「語意指標 (Metrics)」、「外部資料 (External Data)」，符合 `Data Hub separates connection, source, metric, usage, diagnostics, and external-data concerns`；透過單元測試驗證分頁清單與導航路徑解析 (`pnpm --filter @solar-display/web test dataHub`)。
- [x] 1.2 [P] 在 `apps/web/src/app/router.tsx` 中設定 `/settings/data-hub/usage` 與 `/settings/data-hub/diagnostics` 之向後相容重導向，自動導向至 `/settings/data-hub/metrics` 並完整保留 query parameters；透過路由測試驗證舊連結無縫跳轉 (`pnpm --filter @solar-display/web test router`)。

## 2. 實作一站式語意指標卡片（內嵌使用情形與診斷）

- [x] 2.1 在 `apps/web/src/pages/DataHub/Metrics.tsx` 中將原本獨立的 Usage 引用清單與 Diagnostics 健康品質資訊整合成可折疊微型區塊，符合 `Metric profile cards provide inline expandable usage and diagnostic inspection`，讓維運人員在單一卡片即可查看即時數值、大螢幕引用卡片與診斷延遲；透過單元測試驗證展開/收合與數據渲染 (`pnpm --filter @solar-display/web test Metrics`)。
- [x] 2.2 [P] 確保 `Metrics.tsx` 及其子模組遵循單檔 400 行以內規範，並維持 Live WebSocket 即時更新與範圍篩選 (CL/KN/Global/All) 100% 正常；透過行數檢查與即時資料流測試確認無退化。

## 3. 實作 Sources 託管 Solar 轉接器收合微列

- [x] 3.1 在 `apps/web/src/pages/DataHub/SourceCards.tsx` 與 `Sources.tsx` 實作 `ManagedSourceCard` 預設收合微列，符合 `Managed Solar Adapters present a collapsible summary row`，以單行 48px 顯示採集器名稱、連線狀態與分區數量，並支援點擊一鍵展開完整分區清單與語意指標；透過測試驗證收合與展開狀態 (`pnpm --filter @solar-display/web test Sources`)。

## 4. 全量驗證與回歸測試

- [x] 4.1 執行全量前端單元測試套件，確保包含 Data Hub、Metrics、Sources 在內的 1364+ 個測試全數綠燈通過 (`pnpm --filter @solar-display/web test`)。
- [x] 4.2 執行全專案驗證閘道 `pnpm verify`，確保所有 7 大建置與測試階段 100% 通過。
