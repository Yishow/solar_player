## 1. Data Hub 回歸測試

- [x] [P] 1.1 為「Metric profile cards provide inline expandable usage and diagnostic inspection」新增 red tests，證明展開卡片依 `(metricScope, metricKey)` 顯示真實 consumer、freshness/evaluation/failure，以及 loading、empty、error 狀態且失敗不顯示 Healthy；以 `rtk pnpm --filter @solar-display/web test src/pages/DataHub/Metrics.test.tsx` 先確認測試因現況行為失敗。
- [x] [P] 1.2 為「Managed Solar Adapters present a collapsible summary row」新增 red tests，證明 collapsed DOM 只有含 health/topic/zone count 的單列摘要且不含 `SourceRowMeta`、resources、owned metrics，expanded state 才出現完整內容；以 `rtk pnpm --filter @solar-display/web test src/pages/DataHub/Sources.test.tsx` 先確認測試因現況行為失敗。

## 2. Data Hub 行為修正

- [x] [P] 2.1 依「以現有 usage 與 provenance model 組成 metric 展開內容」建立 keyed detail loader/cache，沿用 `UsageModel`、`DiagnosticsModel` 與 inventory row 而不複製 response normalization，使 success/loading/empty/error 可觀察且 late response 不會寫入錯誤 metric；以 1.1 tests 與 model-focused tests 驗證。
- [x] [P] 2.2 依「收合狀態只保留 Managed Solar 的摘要列」調整 `ManagedSourceCard` 的 render branch，使 collapsed surface 只有可操作 summary，expanded surface 才渲染 secondary metadata、zones 與 owned metrics，並保留 ARIA/selectors；以 1.2 tests 驗證。

## 3. MQTT 模組化回歸測試

- [x] 3.1 為「MQTT management components are structured into modular units under 400 lines」補齊 full、connections-only、operations-only surfaces 的 characterization tests，鎖定 API calls、dirty guard、polling、disabled state、callback 與 `data-mqtt-*` selector；以既有 MQTT focused test command 確認拆分前 baseline PASS。

## 4. MQTT 責任拆分

- [x] 4.1 依「依互動責任拆分 MQTT controller 與 content」將 broker、topic/card-data、weather、load/polling 與 remote-sync 狀態協調拆成具名 hooks/controller modules，使 root `MqttSettings` 只組合 surface 且行為不變；以 3.1 characterization tests 驗證。
- [x] 4.2 依「依互動責任拆分 MQTT controller 與 content」將 source mode、topic operations、card data、weather 與 surface composition 拆成具名 view components，使 `MqttSettingsContent` 僅負責組合並保留既有 DOM classes/selectors；以 3.1 characterization tests 驗證。
- [x] 4.3 檢查所有本次新建或重構的 MQTT management source files，確認每檔少於 400 physical lines 且沒有原樣搬移的 monolithic function；以 `wc -l` 清單、responsibility review 與 MQTT focused tests 驗證。

## 5. 完整驗證與收尾

- [x] 5.1 依「以 focused regression tests 與完整 web gate 驗證」執行受影響 Data Hub/MQTT tests、web typecheck/build 與 `rtk pnpm verify`，確認全部 PASS；最後 review `rtk git diff --check` 與完整 diff，證明沒有 server/API/deployment 或 unrelated kiosk change 漂移。
- [x] 5.2 修正複審發現的 MQTT module-boundary 漂移：讓 surface 與 workspace types 只由 `MqttSettingsContent.types.ts` 定義，hooks 不再透過 UI composer 匯入 type；並將聚合 production-source regex assertions 收斂到具名 owner 與 controller-to-view wiring，以 focused MQTT／management display-sync tests、`pnpm verify` 與 fresh Standards／Spec review 驗證。
