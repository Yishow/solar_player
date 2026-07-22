## Context

Playback live 資料流是：

```
MQTT topic
  → topic_mappings
  → live_metric_values（含 server-side derived／aggregate 寫回）
  → Socket liveMetrics:update
  → 各頁 runtime 訂閱子集
  → viewModel／story 顯示
```

輪播 gate 另走：

```
displayMetricRequirements（packages/shared）
  → readiness／freshness
  → displayRotationService
```

現況問題不是 MQTT 連線架構錯誤，而是 **「頁面要哪些 metric」被寫了三次**：

1. Gate：`displayMetricRequirements`／`resolveLiveMetricKeysForPage`／`resolveLiveMetricRequirementsForPage`
2. Runtime 訂閱：Overview／Solar `runtimeContent` 內硬編碼 key 陣列
3. Display binding：`displayStoryService` 與各頁 `viewModel` 各自宣告 `metricKey` + `sourceClass`

已觀察到的具體漂移：

- `todayGeneration`／CO₂：readiness 標 derived；Overview／Solar VM 與部分 story binding 標 `mqtt-live`
- Solar `selfConsumptionEnergy`／`consumptionEnergy`：readiness dependency 有；Solar runtime key 清單沒有
- Overview 三相 `phaseR/S/T*`：runtime 有訂；不在 readiness gate（允許，但必須在 contract 裡明確分「gate keys」與「display-only keys」）
- Factory Circuit／Sustainability 也有類似分叉，但本 change 先不收斂，避免範圍爆炸

Constraints：

- 不改 MQTT broker 連線、socket event 名稱、DB schema
- 不改 rotation skip reason 集合與 freshness window 數值語意
- Overview／Solar 必須維持既有 value-refresh isolation（static subtree 不因無關 metric 更新而重建）
- FHD 視覺、editor capability、Images 頁不在範圍

## Goals / Non-Goals

**Goals:**

- 以 shared 模組作為 Overview／Solar playback metric 契約的單一真相
- 匯出可測試 API：per-page gate requirements、runtime subscription keys、display binding sourceClass 對照
- Overview／Solar runtime 刪除 page-local metric key 常數，改消費 shared
- 對齊 Overview／Solar story／viewModel 的 `sourceClass` 與 readiness（derived 不再假冒 mqtt-live）
- 用測試鎖住「gate keys ⊆ 或可對應到 runtime keys 策略」與 sourceClass 一致

**Non-Goals:**

- 重寫 `MqttClientService`、改 topic 命名、改 socket protocol
- 本 change 內收斂 Factory Circuit slot 雙軌 key 或 Sustainability story 路徑
- 新增 Device Status／Display Ops 的完整「欄位→topic」診斷 UI（可 follow-up）
- 變更 mock／MQTT data mode 行為、broker failure rotation policy
- 為視覺 polish 改 playback shell 或 FHD layout
- 把 derived 計算搬到 frontend

## Decisions

### Decision: 以既有 displayReadiness + displayPageFreshness 為 contract 核，不另起平行 registry

**選擇**：在 `packages/shared` 擴充／整理既有 `displayMetricRequirements` 與 freshness helpers，新增明確的 contract 匯出（例如 per-page runtime keys、display sourceClass map），而不是新建第三份 registry。

**理由**：gate 已是最接近「系統認定頁面需要什麼」的真相；再建平行表會重演分叉。

**替代方案**：新建 `playbackMetricContract.ts` 完全重寫 requirements → 拒絕，遷移成本高且與 readiness 雙寫風險更大。可接受的折衷是 **同檔或薄 wrapper 檔** 重新 export 語意清晰的 API 名稱，但底層仍單一資料源。

### Decision: 區分 gate keys、runtime subscription keys、display binding metadata

Contract 對每個 page 暴露三層，禁止混成一個無結構陣列：

| 層 | 用途 | Overview／Solar 本 change |
|---|---|---|
| Gate requirements | readiness／freshness／rotation | 既有 `displayMetricRequirements` 過濾 page |
| Runtime subscription keys | 前端 `useLiveMetricsSelector` 訂閱集合 | 必須涵蓋該頁 value subtree 實際讀取的 live keys（含 display-only，如 Overview 三相） |
| Display binding metadata | label 以外的 `metricKey` + `sourceClass` + dependencyKeys | story service 與 page VM 共用或對齊同一 sourceClass |

規則：

- Gate 所需 live／dependency keys **必須**能被 runtime 訂閱策略覆蓋，或明確記錄「由 server 先 materialize 成 canonical key 後前端只訂 canonical」（例如 CL+KN aggregate 寫成 `todayGeneration` 後，前端可只訂 `todayGeneration`，但 contract 必須標示 upstream dependency 與 materialize 點在 server）
- Display-only keys（有畫面、無 gate）允許存在，但必須出現在 runtime keys 與 contract 文件化清單
- Page **不得**再維護與 shared 重複的 metric key 字面常數陣列作為真相

### Decision: sourceClass 對齊表（Overview／Solar）

以 readiness `sourceType` 與實際寫入路徑為準，校正 display `sourceClass`：

| metricKey | 對齊後 sourceClass | 說明 |
|---|---|---|
| `realTimePower` | `mqtt-live` | 直接 MQTT |
| `systemEfficiency` | `mqtt-live` | 直接 MQTT |
| `todayGeneration` | `derived-metric` | 可走 factoryGeneration CL+KN 或 canonical live |
| `totalGeneration` | `cumulative-counter` 或 `derived-metric`（與既有 cumulative 語意一致者優先；若值來自 aggregate materialize 則 contract 標 derived／aggregate  provenance，但 sourceClass 不得為 mqtt-live） | 禁止 mqtt-live |
| `todayCo2Reduction` | `derived-metric` | 依 generation／設定衍生 |
| `totalCo2Reduction` | `cumulative-counter` 或 `derived-metric`（同上，禁止 mqtt-live） | |
| `selfConsumptionRatio` | `derived-metric` | 可直送或 energy 比 |

實作時：同步修改 `displayStoryService` 的 Overview／Solar binding 定義與 web `Overview/viewModel`、`Solar/viewModel` 中對應 hardcode；若 story payload 已帶 sourceClass，page VM 仍以 story 為優先，但 server 產出必須已對齊。

### Decision: Overview／Solar runtime 改讀 shared，保留 selector isolation 形狀

- `overviewRuntimeMetricKeys`／`solarRuntimeMetricKeys` 改為 import shared 匯出（`as const` 相容或 readonly string[] 由 shared 保證穩定順序）
- **不**改 selector equality／build partial snapshot 的結構模式（仍用 readings 陣列 + key 對位），以滿足 value-refresh isolation
- Solar runtime keys 必須補齊 story／VM 實際可能讀取的 dependency keys：至少包含 `selfConsumptionEnergy`、`consumptionEnergy`（若 VM／story 在 client 端會讀 snapshot 這些 key）；若 client 只消費 server 已算好的 `selfConsumptionRatio` 且從不讀 energy keys，則 contract 標「server-only dependency」且 runtime 可不訂——以 **實際 client 讀取點** 為準做一次稽核後定案，並用測試鎖住

### Decision: 範圍只含 Overview + Solar；FC／Sustainability 列 follow-up

第一刀只動 Overview／Solar，驗證「單一真相」模式可行。Factory Circuit（slot 雙軌）與 Sustainability（story 主路徑）另開 change，避免與 slot binding／household 計算糾纏。

### Decision: 測試策略（TDD）

1. shared：contract API 對 Overview／Solar 回傳的 keys／sourceClass／requirements 快照或明確集合斷言
2. shared：既有 freshness tests 繼續綠；新增「Solar／Overview runtime key resolver 與 page 消費一致」 
3. web：runtimeContent 不再出現 page-local 完整 key 字面陣列（或僅 re-export shared）；既有 isolation tests 仍過
4. server：displayStoryService 相關 tests 斷言 sourceClass 對齊
5. 不新增 e2e／FHD witness 作為本 change 完成條件（行為非視覺）

## Implementation Contract

### Behavior

- 呼叫 shared contract API 查詢 `overview` 或 `solar` 時，回傳穩定的 gate requirements、runtime subscription keys、以及 display metric 的 sourceClass 對照
- Overview／Solar 前端 runtime 訂閱集合與 shared runtime keys **集合相等**（順序可固定但 equality 以集合語意為主；實作可固定排序方便 readings 對位）
- Overview／Solar 經 story 或 fallback VM 解析出的 KPI `sourceClass`，對上表所列 metric **不得**再把 derived／aggregate 標成 `mqtt-live`
- Rotation／readiness 的 skip reason 集合與「缺 mapping／缺 derived／stale」既有語意不變；本 change 不引入新 skip reason
- Value-only live metrics 更新時，Overview／Solar static layout／hero／ornament／connector 不因訂閱集合改由 shared 匯出而退化（既有 isolation 測試仍為準）

### Interface / data shape

Shared 至少提供（名稱可微調，但語意必須存在且由 `@solar-display/shared` export）：

- 既有：`displayMetricRequirements`、`resolveLiveMetricKeysForPage(pageKey)`、`resolveLiveMetricRequirementsForPage(pageKey)`
- 新增或明確化：
  - `resolvePlaybackRuntimeMetricKeys(pageKey)` → Overview／Solar 的 runtime subscription keys（readonly）
  - `resolvePlaybackDisplayMetricSourceClass(pageKey, metricKey)` 或 per-page display binding descriptors（含 metricKey、sourceClass、dependencyKeys）
- Page runtime 只 import 上述 API，不維護平行真相陣列
- Server `displayStoryService` Overview／Solar binding 定義與 shared display sourceClass 一致

### Failure modes

- 未知 pageKey：resolver 回傳空陣列／空 requirements（與現有 freshness helper 行為一致），不得 throw 導致 playback crash
- story payload 缺 sourceClass：page VM fallback 到 shared／local binding 時，fallback 的 sourceClass 必須已是對齊後值
- 本 change **不**在 runtime 對 sourceClass 漂移做 soft-fail UI；一致性由測試與 server 產出保證

### Acceptance criteria

- `packages/shared` 測試：Overview／Solar runtime keys 與 display sourceClass 對照符合 design 表；derived metrics 不標 mqtt-live
- Overview／Solar runtimeContent 改為消費 shared 後，既有 refresh isolation 測試通過
- `displayStoryService`／相關 web viewModel 測試更新並通過 sourceClass 斷言
- 直跑受影響測試檔（注意 server 頂層 glob 陷阱時直跑檔案）全部通過
- 程式碼搜尋：`apps/web/src/pages/Overview/runtimeContent.tsx` 與 `Solar/runtimeContent.tsx` 不再定義獨立的完整 metric key 真相陣列

### Scope boundaries

**In scope**

- shared contract 匯出與測試
- Overview／Solar runtimeContent、viewModel、displayStoryService binding 對齊
- 相關 unit tests

**Out of scope**

- Factory Circuit、Sustainability、Images
- MQTT settings UI、topic_mappings schema
- Ops 診斷 UI、FHD witness、playback shell
- 新 skip reason、freshness window 預設值變更

## Risks / Trade-offs

- [Solar runtime 補訂 dependency keys 增加 selector 更新頻率] → 只訂 client 實際讀取的 key；用 isolation 測試確認 static 不受影響
- [sourceClass 字串變更影響依賴字面比對的測試或 UI tooltip] → 全庫搜尋 `todayGeneration`+`mqtt-live` 等組合並更新斷言；tooltip 文案若寫死「MQTT」需改為依 sourceClass
- [只做 Overview／Solar 仍留下 FC 混亂] → 在 design／tasks 標 follow-up change 名稱建議，不在本 change 膨脹
- [誤改 readiness 集合導致輪播行為變化] → 本 change 預設不改 `displayMetricRequirements` 的 page/requirement 集合，只改 consumer 與 sourceClass；若稽核發現 gate 缺 key 必須補，另用測試鎖定 playable 語意不變

## Migration Plan

1. 先加 shared contract API + 測試（紅／綠）
2. 切 Overview／Solar runtime 消費 shared
3. 對齊 story service 與 viewModel sourceClass
4. 跑 shared + 受影響 web／server 測試
5. 回滾：還原 shared export 與三處 consumer 即可；無 DB migration

## Open Questions

- （實作時一次稽核定案，不阻塞 propose）Solar client 是否仍直接讀 `selfConsumptionEnergy`／`consumptionEnergy` snapshot，或只讀 server materialize 的 `selfConsumptionRatio`——決定 runtime keys 是否包含 energy keys。
