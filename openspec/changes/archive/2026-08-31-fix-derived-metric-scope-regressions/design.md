## Context

`add-widget-data-bindings` 引入了跨站別 widget 綁定：一台 CL/KN playback 裝置的頁面可以顯式綁定另一站別的 metric。伺服器端由 `SocketService` 依 playback metric authorization plan，只把該 session 真正需要的外來 scope metric identity 送給該裝置。`add-derived-metric-registry` 則把 `selfConsumptionRatio`、`todayCo2Reduction`、`totalCo2Reduction`、`totalPower`、`todayGeneration`、`monthGeneration`、`totalGeneration` 這些原本硬寫的公式改由 derived metric registry 提供，並在 migration `037_derived_metric_registry.sql` 把對應的舊 topic mapping 列設為 `enabled = 0`（保留列、不刪除）。

Code review 在 `b57ff455eb9302e46b2c106bab1174c9b0436974..HEAD` 找出 7 項缺陷。本 change 只修這 7 項，不重構上述兩套機制。

現況的三個關鍵事實決定了修法：

- Web 端共用的 live metrics store（`apps/web/src/hooks/liveMetricsStore.ts`）用「最後一個收到的非 global scoped 快照」推斷裝置本站是哪一站，因此無法區分「本站快照」與「外來 scope 的過濾後快照」。
- MQTT Settings 管理頁自己維護一份以 `<scope>:<metricKey>` 為鍵的快照（`mergeScopedLiveMetricsSnapshot`），不依賴共用 store 的本站推斷；playback 頁則以裸 `metricKey` 讀取共用 store。
- Registry 編譯（`compileStoredRegistry` 系列）判定 topic mapping 衝突時只看 `topic_mappings WHERE enabled = 1`，而 `PUT /api/settings/mqtt/topics` 的前置檢查兩端都不看 enabled，因此比 registry 嚴格。

## Goals / Non-Goals

**Goals:**

- 跨站別綁定的裝置能同時看到本站與被授權的外來 scope 讀數，本站讀數不因外來廣播而消失或閃爍。
- Socket 連線結束後不再保留該裝置的外來 metric 授權狀態。
- 既有部署升級後可以正常儲存 MQTT topic mappings，衝突判定與 registry 編譯一致。
- Display Editor 提供的 scope 選項與伺服器實際接受的 scope 一致。
- Display data preview 的 binding plan 快取有上限且在 registry 變更後失效。
- Derived metric 面板的 Preview 對 KN-only 定義可用。
- Mock metrics feed 不再每個 tick 重編 registry。

**Non-Goals:**

- 不把共用 live metrics store 的 `metrics` 改成 scope-qualified 鍵空間。同一頁面同時綁定 `cl:<metricKey>` 與 `kn:<metricKey>` 時仍會撞鍵，本 change 只定義確定性的優先序（本站優先），完整解法留待後續 change。
- 不改變 `emitManagementOnly` 對 management-trusted session 的既有廣播語意。
- 不刪除 migration `037` 停用的 topic mapping 列，也不新增刪除 topic mapping 的管理 UI。
- 不調整 `apps/server/src/services/factoryGenerationAggregateService.ts` 中的 registry 初始化呼叫（該處在結構性資料異動後執行，不是每 tick 熱路徑）。
- 不做視覺調整或 route shell 變更。
- 不擴大測試 runner 的涵蓋範圍：`apps/web` 的 `src/**/*.test.ts` glob 不涵蓋 `.test.tsx`，`scripts/verify.mjs` 也未涵蓋 `packages/shared` 測試。本 change 把新測試放進實際會被執行的檔案，不動 runner 本身。

## Decisions

### 以顯式的外來標記區分跨站別快照，取代由接收順序推斷本站

`ScopedLiveMetricsSnapshot` 增加一個選用布林欄位 `foreignSite`。伺服器在「為了跨站別綁定而送出的過濾後快照」上帶 `foreignSite: true`；本站快照、global 快照、management-trusted 廣播、`/api/metrics/live` bootstrap 回應都不帶此欄位。

Web store 據此分成兩份狀態：本站／global 快照沿用既有 `scopedSnapshots`，帶 `foreignSite` 的快照存入獨立的 foreign 快照集合，且**不**改寫 `activeSiteScope`、**不**刪除另一站別的快照。組合順序為 `global` → foreign（依 scope 穩定排序）→ 本站，本站最後套用，因此鍵衝突時本站值勝出。

**替代方案：** 讓客戶端從 device context API 得知自己的 siteScope。否決原因是共用 store 不持有 device context，且 management-trusted session 沒有單一 siteScope，會把管理頁一併打壞。

**替代方案：** 伺服器改送 scope-qualified 鍵。否決原因是所有 playback viewModel 都以裸 `metricKey` 讀取，屬於 Non-Goals 的大範圍重構。

### 頁面層級 timestamp 不受外來 scope 讀數影響

組合後快照的 `timestamp` 與 `freshnessPolicy` 仍只由 global 與本站快照決定，外來 scope 讀數只提供 `metrics` 條目。理由是頁面層級的「最後更新時間」與 freshness 顯示語意屬於本站，讓外來站別的時間戳參與會改變既有 freshness 行為，超出本 change 範圍。

### per-device 外來授權狀態改以連線集合維護並於斷線釋放

`deviceForeignMetricIdentities` 由 `Map<deviceId, ScopedMetricIdentity[]>` 改為同時記錄該 device 目前的連線集合。連線建立時加入該 socket id，`disconnect` handler 移除該 socket id，集合為空時刪除整個 device 條目。identities 以最近一次解析出的 authorization plan 為準。

**替代方案：** 直接以 socket id 為鍵。否決原因是 `emitLiveMetrics` 是對 `device:<id>` room 廣播，同一 device 有多個 socket 時會重複發送。

### 以 migration 移除被 derived metric 接管的退役 topic mapping 列

實作期間以實測推翻了提案時的假設。在 migrate + seed 的乾淨資料庫上，round-trip 儲存成功；只有把 migration `037` 停用但保留的列補回去（即既有部署升級後的真實狀態），`GET` → `PUT` 才會回 409 `DERIVED_METRIC_IDENTITY_CONFLICT`。同時 `apps/server/src/routes/settings-mqtt.test.ts` 既有兩個測試明確主張 derived metric identity 是被「保留」的：不論傳入的 mapping 或 definition 是否啟用，都不得佔用該 identity。

因此缺陷不在衝突規則太嚴，而在 migration `037` 只停用不刪除，讓 Data Hub → Sources 把死列原樣送回。修法是新增一個 migration，刪除被 derived metric 接管的那些 scoped identity 的 topic mapping 列，與 migration `036` 對 Solar adapter 接管識別碼的既有做法一致。衝突規則本身不動。

**替代方案：** 放寬 `PUT` 的衝突判定，只在雙方皆 enabled 時才 409。否決原因是與上述兩個刻意撰寫的既有測試直接衝突，等於單方面改掉 identity reservation 的設計意圖。

**替代方案：** `GET /api/settings/mqtt/topics` 過濾掉 derived-owned 的列。否決原因是改變讀取端契約，且死列會永遠留在資料庫裡。

**實作期間的修正：** 第一版的 DELETE 述詞照抄 migration `037` 的清單，把 `cl/kn: totalPower` 一併刪除。逐一實測 11 個候選 identity 後確認只有 9 個真的被保留，`totalPower` 的儲存一直回 200——刪除它等於無故銷毀操作者設定的 topic、倍率、offset、小數位與名稱。述詞已收斂為那 9 個。

### Display Editor 與伺服器共用同一套有效 metric catalog 疊加邏輯

把「以 derived metric 定義覆蓋內建 catalog 條目（含 `totalPower` 在 factory-circuit 頁對 `factoryCircuit.jungliTotalPower`／`factoryCircuit.guanyinTotalPower` 的對應）並附加自訂定義」的邏輯抽成 `packages/shared` 的純函式，伺服器的 `resolveServerPlaybackMetricCatalog` 與編輯器 Data inspector 同時使用。編輯器需要的 registry diagnostics 已由 `GET /api/derived-metrics` 回傳，只是目前被 web API client 丟棄，改為一併回傳。

**替代方案：** 新增一支回傳解析後 catalog 的 API。否決原因是編輯器已經取得所有輸入，只差一次純運算，多開端點會擴張 API 邊界。

### Preview binding plan 快取加入 registry revision 與容量上限

快取鍵加入目前的 derived metric registry revision；registry revision 變更後舊 plan 自然失去命中。同時為快取加上固定上限，超過時以插入順序淘汰最舊項目，使單一 process 的記憶體佔用有界。

### Derived metric 面板 Preview 使用定義實際評估的 scope

Preview 送出的 scope 改用該定義的第一個評估 scope（global 政策為 `global`，site 政策為 `siteScopes` 的第一項，未指定時為 `cl`），與同檔案既有的評估列表使用同一份推導。

### Mock metrics feed 不再每個 tick 重編 registry

移除 mock feed 寫入讀數後的 registry 初始化呼叫。`evaluateDerivedMetrics` 本身已在取不到快照時惰性初始化，啟動路徑也已初始化過一次。

## Implementation Contract

**行為**

1. 一台 KN playback 裝置，頁面上有一個顯式綁定 CL metric 的 widget：連線完成後，頁面同時顯示本站 KN 讀數與該 CL 讀數；後續任一站別的廣播都不會使另一站別的讀數消失或退回 fallback。CL 與 KN 對調時行為相同。
2. Socket 斷線後，伺服器不再為該裝置保留外來 metric identity；該裝置沒有任何連線時，跨站別廣播不再對其 room 發送。
3. 在既有部署升級後，從 Data Hub → Sources 讀出 topic mappings 再原樣儲存會成功：被 derived metric 接管的 9 個 scoped identity（`cl/kn: selfConsumptionRatio`、`todayCo2Reduction`、`totalCo2Reduction` 與 `global: todayGeneration`、`monthGeneration`、`totalGeneration`）列已被移除。`cl/kn: totalPower` 不在此列——definitions 的 key 是 `factoryCircuit.jungliTotalPower` 與 `factoryCircuit.guanyinTotalPower`，該 identity 從未被保留、儲存一直是 200，其列與操作者設定必須完整保留。明確送出撞 identity 的 topic 仍回 409，不論其 enabled 與否。
8. 一台裝置的某條連線授權解析失敗時，只有該連線停止跨站別傳遞；同一裝置其他解析成功的連線維持傳遞。
9. 重新連線後，客戶端不再顯示上一段連線遺留的跨站別讀數；仍被授權的部分由 bootstrap 重新送達。
10. 衍生指標目錄尚未載入或載入失敗時，Data inspector 的指標與範圍選單不可編輯。
4. Display Editor 的 Data inspector，scope 下拉只列出該 metric 在伺服器端實際被接受的 scope；`selfConsumptionRatio` 之類 site 政策定義不出現「全域」，`totalPower` 在 Jungli 頁不出現 KN、在 Guanyin 頁不出現 CL。
5. 儲存草稿或變更 derived metric 定義後再取 preview，回傳的 `sourceClass` 與 `dependencyIdentities` 反映變更後的 registry。
6. Derived metric registry 面板對 `factoryCircuit.guanyinTotalPower` 按 Preview 會得到評估結果或具體失敗碼，不再必然是 `derived_metric_invalid_preview_scope`。
7. Mock metrics feed 每個 tick 只做讀數寫入與 derived metric 評估。

**介面與資料形狀**

- `ScopedLiveMetricsSnapshot` 增加選用欄位 `foreignSite?: boolean`。缺省或 `false` 表示該快照屬於接收端本站或 global。
- `packages/shared` 匯出純函式，輸入為 binding page key、derived metric 定義陣列與被排除的 metric key 集合，輸出為有效的 `MetricCatalogEntry` 陣列；伺服器與編輯器皆呼叫此函式。
- Web API client 取得 derived metric 目錄時一併回傳 registry diagnostics。
- `apps/server/src/services/derivedMetricRegistryService.ts` 匯出可讀取目前 registry revision 的函式，供 preview 快取鍵使用。

**失敗模式**

- Authorization plan 解析失敗時維持既有 fail-closed 行為：該裝置的外來 identity 視為空集合，只收本站與 global。
- 外來 scope 綁定被移除時，伺服器送出該 scope 的空 metrics 快照（帶 `foreignSite: true`），客戶端據此清空該 scope 的外來讀數。
- Topic 儲存衝突仍以 409 與既有 `DERIVED_METRIC_IDENTITY_CONFLICT`／`MANAGED_SOURCE_METRIC_CONFLICT` 代碼回覆，代碼與訊息形狀不變。
- Preview 快取淘汰是靜默的，只影響延遲不影響結果。

**驗收方式**

- `apps/server/src/realtime/SocketService.test.ts`：新增測試涵蓋外來快照帶標記、斷線後不再對該 device 發送。
- `apps/web/src/hooks/liveMetricsStore.test.ts`：新增測試涵蓋外來快照不覆寫本站、鍵衝突時本站優先、外來空快照清除。
- `apps/server/src/routes/settings-mqtt.test.ts`：新增測試涵蓋含 disabled derived identity 列的 payload 儲存成功、啟用衝突仍 409。
- `apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx`：新增測試涵蓋 scope 選項與伺服器 catalog 一致。
- `apps/server/src/services/displayDataPreviewService.test.ts`：新增測試涵蓋 registry revision 變更後不命中舊快取、快取容量有上限。
- `apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.test.tsx`：新增測試涵蓋 KN-only 定義的 preview scope。
- `apps/server/src/services/MockMetricsFeedService.test.ts`：新增測試涵蓋 tick 不重編 registry。
- 交付 gate 為 `pnpm verify`。

**範圍邊界**

- 在範圍內：上述 7 項行為、對應測試、五份 spec delta。
- 在範圍內（實作期間追加）：`apps/web/src/pages/DataHub/WeatherModel.test.ts` 的時鐘相依修正。該測試 fixture 寫死觀測時間，而 staleness 判定回退到目前時鐘，因此在 fixture 日期之後必然失敗，使 `pnpm verify` 無法全綠。修正方式是注入固定的 `now`，不改動 `apps/web/src/components/headerWeatherMeta.ts` 的產品行為。
- 不在範圍內：scope-qualified 客戶端鍵空間、topic mapping 刪除 UI、`factoryGenerationAggregateService` 的初始化呼叫、測試 runner 的 glob 與 verify stage 涵蓋範圍、任何視覺或版面調整。

## Risks / Trade-offs

- 同頁同時綁定兩站別的同名 metric 時仍會撞鍵，本站值勝出 → 以明確的組合優先序讓行為可預期，並在 spec delta 中記錄此限制，作為後續 change 的入口。
- 外來 scope 讀數不參與頁面 timestamp，跨站別 widget 的 freshness 顯示可能沿用本站時間 → 本 change 維持既有 freshness 語意不動，避免同時改動兩套行為；若實際驗收發現不足，另開 change 處理。
- 放寬 topic 衝突判定後，使用者若重新啟用一個與 derived metric 撞 identity 的舊 topic，仍會在儲存時被 409 擋下 → 這是預期行為，與 registry 編譯一致。
- 抽出共用 catalog 疊加函式會讓 `packages/shared` 多一個模組，伺服器與編輯器的行為自此綁在一起 → 這正是本項缺陷的根因，綁在一起是目的而非副作用。
