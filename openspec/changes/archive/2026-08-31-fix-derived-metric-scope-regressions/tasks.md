## 1. 共用契約

- [x] 1.1 依「以顯式的外來標記區分跨站別快照，取代由接收順序推斷本站」在 `packages/shared` 的 scoped live metrics 快照型別加入選用欄位 `foreignSite?: boolean`，缺省或 `false` 表示該快照屬於接收端本站或 global；`apps/web/src/services/socket.ts` 的 `ScopedLiveMetricsSnapshot` 同步採用。驗證：`pnpm --filter @solar-display/shared build` 通過，且 `pnpm --filter @solar-display/server test` 與 `pnpm --filter @solar-display/web test` 不因此型別變更出現新失敗。
- [x] 1.2 [P] 依「Display Editor 與伺服器共用同一套有效 metric catalog 疊加邏輯」在 `packages/shared/src/derivedMetricCatalogOverlay.ts` 新增純函式，輸入 binding page key、derived metric 定義陣列與被排除的 metric key 集合，輸出有效的 `MetricCatalogEntry` 陣列；行為需涵蓋 `totalPower` 在 `factory-circuit` 與 `factory-circuit-guanyin` 分別對應 `factoryCircuit.jungliTotalPower` 與 `factoryCircuit.guanyinTotalPower`、以 `derivedMetricCatalogMetadata` 覆蓋 `allowedScopes` 並保留內建 `label` 與 `metricKey`、以及附加未撞鍵的自訂啟用定義。驗證：新增 `packages/shared/src/derivedMetricCatalogOverlay.test.ts`（與既有 11 個 shared 測試同慣例），以 `pnpm exec tsx --test packages/shared/src/derivedMetricCatalogOverlay.test.ts` 實際執行並確認通過，斷言三個頁面 key 的 `allowedScopes` 結果符合 design 的 offered scopes 表格；同一份表格另由 4.2 的 web 測試在 `pnpm verify` 內覆蓋，因為目前 verify 未涵蓋 packages/shared 測試。

## 2. 跨站別 live metrics 傳遞

- [x] 2.1 實作「Cross-site delivery never displaces the session's own-site snapshot」的伺服器端：`SocketService` 在連線快照與廣播兩條路徑上，只對「為跨站別綁定而過濾的快照」帶 `foreignSite: true`，本站快照、global 快照、management-trusted 廣播與 `/api/metrics/live` bootstrap 一律不帶。驗證：先在 `apps/server/src/realtime/SocketService.test.ts` 加入失敗測試，斷言 KN session 收到的 CL 過濾快照帶標記且 KN／global 快照不帶，再實作至測試通過。
- [x] 2.2 實作「Cross-site delivery never displaces the session's own-site snapshot」的客戶端：`apps/web/src/hooks/liveMetricsStore.ts` 將帶 `foreignSite` 的快照存入獨立集合，不改寫 `activeSiteScope` 也不刪除另一站別快照，組合順序為 global → 跨站別 → 本站（本站最後套用故鍵衝突時勝出）；同時依「頁面層級 timestamp 不受外來 scope 讀數影響」，組合後的 `timestamp` 與 `freshnessPolicy` 仍只由 global 與本站快照決定。驗證：先在 `apps/web/src/hooks/liveMetricsStore.test.ts` 加入失敗測試，涵蓋 spec 的三個 scenario（KN session 保留 KN 讀數、鍵衝突本站優先、跨站別空快照只清除跨站別讀數）與 timestamp 不受跨站別影響，再實作至測試通過。
- [x] 2.3 實作「Per-device cross-site subscription state is released when the device disconnects」，依「per-device 外來授權狀態改以連線集合維護並於斷線釋放」把 `SocketService` 的 per-device 外來 identity 狀態改為同時記錄該 device 的連線集合，連線加入、`disconnect` 移除、集合為空時刪除整個 device 條目，identities 以最近一次解析的 authorization plan 為準。驗證：先在 `apps/server/src/realtime/SocketService.test.ts` 加入失敗測試，斷言單一連線斷線後跨站別廣播不再對該 device 發送、且兩個連線只斷一個時仍每次廣播恰好送達一次，再實作至測試通過。

## 3. MQTT topic 儲存

- [x] 3.1 [P] 實作「Retired topic mappings are removed when a derived metric takes over their identity」，依「以 migration 移除被 derived metric 接管的退役 topic mapping 列」新增 `apps/server/src/db/migrations/039_remove_derived_metric_topic_mappings.sql`，刪除 migration `037` 停用但保留的那些 scoped identity 列，使既有部署從 Data Hub → Sources 讀出後原樣儲存會成功；`PUT /api/settings/mqtt/topics` 的 identity 保留規則與 409 `DERIVED_METRIC_IDENTITY_CONFLICT` 回應形狀一律不動。驗證：先在 `apps/server/src/routes/settings-mqtt.test.ts` 加入失敗測試，模擬升級後的資料庫（補回 disabled 的退役列）並斷言 `GET` 後原樣 `PUT` 回 200 且退役列不再存在，再實作至測試通過；既有兩個主張 identity 保留的測試必須維持通過。

## 4. Display Editor 目錄一致性

- [x] 4.1 讓 `apps/server/src/services/derivedMetricCatalogService.ts` 的 `resolveServerPlaybackMetricCatalog` 改為呼叫 1.2 的共用疊加函式，並自行提供 enabled 定義與 diagnostics 排除集合，伺服器端解析結果不變。驗證：既有 `apps/server/src/services/displayStoryService.test.ts` 與 derived metric catalog 相關測試維持通過，不新增行為差異。
- [x] 4.2 實作「Authoring scope options come from the effective metric catalog」：`apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx` 改以 1.2 的共用疊加函式建構 catalog，scope 下拉只列出伺服器實際接受的 scope。驗證：先新增 `apps/web/src/pages/DisplayPagesEditor/dataInspectorScopeOptions.test.ts` 加入失敗測試（用 `.test.ts` 是因為 web runner 的 `src/**/*.test.ts` glob 不涵蓋 `.test.tsx`，寫進 `.tsx` 的測試不會被 `pnpm verify` 執行），透過已匯出的純函式 `resolveDataInspectorModel` 斷言 `selfConsumptionRatio` 不出現全域、`totalPower` 在 Jungli 頁不出現 KN、在 Guanyin 頁不出現 CL，再實作至測試通過。
- [x] 4.3 讓 `apps/web/src/services/api.ts` 取得 derived metric 目錄時一併回傳 `GET /api/derived-metrics` 已提供的 registry diagnostics，供 4.2 的疊加函式作為排除集合輸入；既有呼叫端行為不變。驗證：更新受影響的 web 測試並確認 `pnpm --filter @solar-display/web test` 通過。

## 5. Preview 快取

- [x] 5.1 實作「Cached preview binding plans invalidate on derived metric registry changes」，依「Preview binding plan 快取加入 registry revision 與容量上限」，由 `apps/server/src/services/derivedMetricRegistryService.ts` 匯出可讀取目前 registry revision 的函式，並將該 revision 納入 `apps/server/src/services/displayDataPreviewService.ts` 的快取鍵。驗證：先在 `apps/server/src/services/displayDataPreviewService.test.ts` 加入失敗測試，斷言啟用／停用 derived metric 定義後，設定未變的 preview 會重新編譯並回報更新後的 `sourceClass` 與 `dependencyIdentities`，而 registry 未變時仍命中快取，再實作至測試通過。
- [x] 5.2 實作「Preview binding plan cache is bounded」，為 preview binding plan 快取加上固定上限並以插入順序淘汰最舊項目，淘汰只影響延遲不改變結果。驗證：在 `apps/server/src/services/displayDataPreviewService.test.ts` 加入測試，斷言超過上限後保留項目數不超過上限，且被淘汰的組合重新請求時回傳相同結果。

## 6. Derived metric 面板與 mock feed

- [x] 6.1 [P] 實作「Draft preview defaults to a scope the definition evaluates」，依「Derived metric 面板 Preview 使用定義實際評估的 scope」，讓 `apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.tsx` 的 Preview 送出該定義的第一個評估 scope，與面板既有的 applicable scopes 推導同源。驗證：先把面板既有的 `evaluationScopes` 推導匯出為可測試的純函式，並新增 `apps/web/src/pages/DataSourceSettings/derivedMetricPreviewScope.test.ts` 加入失敗測試（用 `.test.ts` 是因為 web runner 不涵蓋 `.test.tsx`），涵蓋 spec 的預設 preview scope 表格（global 政策、CL+KN、KN-only、未宣告 sites），再實作至測試通過。
- [x] 6.2 [P] 依「Mock metrics feed 不再每個 tick 重編 registry」移除 `apps/server/src/services/MockMetricsFeedService.ts` 寫入讀數後的 registry 初始化呼叫，每個 tick 只做讀數寫入與 derived metric 評估，derived metric 評估結果不變。驗證：在 `apps/server/src/services/MockMetricsFeedService.test.ts` 加入測試，斷言連續兩個 tick 不觸發 registry 重新編譯且 derived metric 評估值與修改前一致。

## 7. 交付驗證

- [x] 7.1 修正 `apps/web/src/pages/DataHub/WeatherModel.test.ts` 的時鐘相依失敗：該測試的 fixture 寫死 `observationTime`，而 `headerWeatherMeta` 的 staleness 判定回退到 `new Date()`，導致測試在 fixture 日期之後必然渲染「資料延遲」。改為注入固定的 `now`，使測試結果與執行當下的時鐘無關；產品行為不變。驗證：`pnpm --filter @solar-display/web test` 中該測試通過，且不需要修改 `apps/web/src/components/headerWeatherMeta.ts` 的產品程式碼。
- [x] 7.2 執行 `pnpm verify` 並確認全綠；若有失敗，修正後重跑並在回報中附上實際輸出摘要。
