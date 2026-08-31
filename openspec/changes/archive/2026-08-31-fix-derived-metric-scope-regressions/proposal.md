## Why

Code review 涵蓋 `b57ff455eb9302e46b2c106bab1174c9b0436974..HEAD`（4 個已 archive 的 change：`add-widget-data-bindings`、`add-derived-metric-registry`、`remove-header-sync-status-indicator`、`improve-data-management-workflows`），確認 7 項缺陷，全部源自 derived metric registry 與 metric scope 綁定這一批新落地的行為。其中兩項會直接讓既有部署的日常操作失效：跨站別 widget 綁定會讓 playback 裝置本站所有指標退回 fallback；已升級的既有安裝在 Data Hub → Sources 第一次儲存 topic 就會被 409 擋住且無 UI 可解。其餘五項為記憶體無界成長、快取失效遺漏、編輯器提供伺服器會拒絕的選項、預覽永久失敗與每分鐘重編 registry。

## What Changes

- 修正跨站別 live metrics 傳遞：外來 scope 的 `liveMetrics:update` 不再被 web store 誤判為裝置本站快照，本站快照不再被刪除。
- 修正 socket 斷線後 per-device 外來 metric 授權狀態未釋放的問題。
- 新增 migration，刪除被 derived metric 接管的 9 個退役 topic mapping identity，讓既有部署可以正常儲存 Data Hub → Sources；未被保留的 identity（含 `totalPower`）連同操作者設定完整保留，identity 保留規則本身不變。
- Display Editor 的 Data inspector scope 下拉改用與伺服器驗證同源的有效 metric catalog，不再提供會被 422 拒絕的 scope。
- Display data preview 的 binding plan 快取加入容量上限與 derived metric registry revision，避免無界成長與過期 plan。
- Derived metric registry 面板的 Preview 改用該定義實際會評估的 scope，KN-only 定義不再必然失敗。
- 移除 mock metrics feed 每個 tick 重編整個 derived metric registry 的呼叫。
- 修正 `apps/web/src/pages/DataHub/WeatherModel.test.ts` 的時鐘相依失敗，使 `pnpm verify` 這道交付 gate 有可能全綠；純測試修正，不動產品行為。

## Non-Goals

- 不重構 live metrics 快照的扁平 `metrics` 鍵空間。同一頁面同時綁定 `cl:<metricKey>` 與 `kn:<metricKey>` 時仍會在客戶端撞鍵；本 change 只保證本站值優先且不再整批消失，scope-qualified 客戶端鍵空間留待後續 change。
- 不調整 `apps/server/src/services/factoryGenerationAggregateService.ts` 中同樣呼叫 registry 初始化的路徑，該處在結構性資料異動後執行，不屬於每 tick 熱路徑。
- 不做任何 FHD 視覺調整、route shell 或 API 形狀變更。
- 不新增刪除 topic mapping 的管理 UI；本 change 只讓既有 disabled 列不再阻擋儲存。
- 不擴大測試 runner 的涵蓋範圍。實作前查證發現 `apps/web` 的 runner glob `src/**/*.test.ts` 不涵蓋 53 個 `.test.tsx` 檔，`scripts/verify.mjs` 也未涵蓋 `packages/shared` 的 11 個測試檔；本 change 的因應方式是把新測試放進實際會被執行的 `.test.ts`，runner 缺口本身留待另一個 change 處理。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `playback-live-metrics-subscription-isolation`：新增跨站別傳遞不得排擠本站快照、以及 per-device 外來訂閱狀態於連線結束時釋放的要求。
- `derived-metric-registry`：要求被 derived metric 接管的 topic mapping 列必須移除而非停用，使管理介面的讀取後原樣儲存可以成功。
- `display-widget-data-binding`：要求編輯器提供的 scope 選項來自與伺服器驗證同源的有效 metric catalog。
- `display-editor-data-preview-context`：要求 preview binding plan 快取在 derived metric registry 變更後失效，並具有容量上限。
- `derived-metric-expression-authoring`：要求 draft preview 使用該定義實際評估的 scope。

## Impact

- Affected specs：`playback-live-metrics-subscription-isolation`、`derived-metric-registry`、`display-widget-data-binding`、`display-editor-data-preview-context`、`derived-metric-expression-authoring`
- Affected code:
  - Modified:
    - `apps/server/src/realtime/SocketService.ts`
    - `apps/web/src/hooks/liveMetricsStore.ts`
    - `apps/web/src/services/socket.ts`
    - `apps/server/src/routes/settings-mqtt.ts`
    - `apps/server/src/services/displayDataPreviewService.ts`
    - `apps/server/src/services/derivedMetricRegistryService.ts`
    - `apps/server/src/services/derivedMetricCatalogService.ts`
    - `apps/server/src/services/MockMetricsFeedService.ts`
    - `apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx`
    - `apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.tsx`
    - `apps/web/src/services/api.ts`
    - `packages/shared/src/metricScope.ts`
    - `apps/web/src/pages/DataHub/WeatherModel.test.ts`
  - New:
    - `packages/shared/src/derivedMetricCatalogOverlay.ts`
    - `apps/server/src/db/migrations/039_remove_derived_metric_topic_mappings.sql`
  - Removed:（無）
- 含一個資料庫 migration，刪除被 derived metric 接管的退役 topic mapping 列。
