## Context

現場 `solar_mqtt` 的 `Scraper.fetch_zones()` 已從 API 欄位 `x7` 取得每個 zone 的累積 `total_mwh`，`FactoryService._publish_data()` 也以 retained QoS 1 發布完整 zone JSON 與各 scalar zone topic。缺口是 `fetch_summary()` 只提供 power、today、month，publisher 沒有從同輪 zones 計算廠區 `total_mwh`，也沒有發布廠區 scalar total。

Solar Player 現行 `MqttClientService` 依 `topic_mappings` 將 JSON value path 寫入 `live_metric_values`；`MetricsAccumulatorService` 把 canonical combined `totalGeneration` 寫入 `cumulative_counters.generation`。播放設定另以 `factory-circuit` 與 `factory-circuit-guanyin` 兩個 page enable flag 表達中壢、觀音是否加入輪播，兩者是獨立開關而非單選。Sustainability 必須沿用這組既有設定解析廠區 scope，不能永遠只讀 combined counter，也不能另建一套頁內選擇狀態。

## Goals / Non-Goals

**Goals:**

- 由現場 publisher 以同輪完整 zone snapshot 計算 CL、KN 各自的日、月、累積發電量。
- 缺任一 zone 累積值時保留 broker 上次正確 retained 廠區 total，不發布部分總量或 0。
- Solar Player 以 CL、KN summary 建立完整雙廠 snapshot，產生 canonical today/month/total generation。
- Sustainability 保持單一頁面，依播放設定使用 CL、KN 或 CL + KN `total_mwh`，並保留與 scope 一致的 provenance。
- 讓 mapping/readiness、累積 counter 與 playback refresh 對 derived metric 有一致理解。

**Non-Goals:**

- 不修改現場網頁 scraper 的 API endpoint、登入、zone identity 或抓取週期。
- 不讓 Solar Player 直接訂閱所有 zone topics 重做 publisher 的聚合。
- 不把缺值當 0、不累加每次收到的 cumulative reading、不使用外部 CO₂ topic。
- 不修改 carbon factor、tree factor、Wi-Fi、broker host、weather、Factory Circuit 幾何或 Sustainability 視覺版型。
- 不新增 Sustainability 頁內 selector，不把兩個播放設定廠區開關改成互斥單選。

## Decisions

### 由 solar_mqtt 擁有 zone 到廠區的聚合

`FactoryService` 在同一次 `scraper.fetch()` 回傳的 zones 上計算 `total_mwh`。計算只接受非空 zones 且每個 `total_mwh` 都是 finite number；0 是有效值，`None`、NaN、Infinity 或缺 key 是 invalid。有效時把 rounded sum 加入 summary，並發布 retained `solar/{factory}/summary` 與 `solar/{factory}/total_mwh`。既有 zone topics 保持不變。

替代方案是 Solar Player 訂閱所有 zone topics；這會把 CL/KN zone count 與訊息到達順序耦合進播放器，且容易在 retained messages 尚未到齊時產生部分總量，因此拒絕。

### 缺 zone 時保留最後正確 retained total

當任一 zone 的 `total_mwh` invalid 時，publisher 仍可發布 power/today/month 與 zone 診斷資料，但不得在 summary 放入假的 `total_mwh`，也不得更新 `solar/{factory}/total_mwh` scalar。它必須發布 bounded alert，指出 factory 與 invalid zone ids，不包含憑證或 raw API payload。broker 因未收到新的 scalar publish 而保留上一筆正確 retained total。

summary 本身可省略 `total_mwh`，讓任何訂閱完整 summary 的 consumer 明確辨識該輪 incomplete；不使用上一筆值混入本輪 summary。

### 以兩個 factory summary 建立 canonical generation

Solar Player migration 新增六個 source mappings：CL/KN 各自的 `today_mwh`、`month_mwh`、`total_mwh`，共同訂閱 `solar/CL/summary` 與 `solar/KN/summary` 並使用 JSON value paths。舊的 direct `todayGeneration`、`totalGeneration` mappings 停用，避免與 derived values 競爭寫入 canonical metric keys。

`factoryGenerationAggregateService` 是唯一的雙廠 adapter。它讀取兩廠 source metrics 與 summary raw payload timestamp，正規化 MWh，並在 CL、KN 都 finite、都有 source timestamp、且未超過既有 MQTT message timeout 時，更新 canonical `todayGeneration`、`monthGeneration`、`totalGeneration`。這個 module 隱藏完整性、unit conversion、source timestamp 與 canonical persistence；刪除它會中斷雙廠聚合，因此不是 pass-through wrapper。

### 不讓部分或倒退總量覆蓋 canonical metric

若任一 factory 缺值、stale 或 timestamp 無效，aggregate service 不更新該 canonical metric，保留最後完整 canonical reading 並輸出 readiness warning。若新的 combined `totalGeneration` 小於最後 canonical total，視為 source reset/inconsistency，不覆蓋 cumulative counter，直到兩廠提供可接受的新基準或 operator 明確處理 reset。日量與月量允許在日／月邊界下降；累積量不允許無聲倒退。

明確 reset 由 trusted management mutation 執行。operator 必須回傳目前完整 CL + KN source total 作為 optimistic confirmation；service 只在來源完整、current、確實處於 regression，且確認值與目前 lower aggregate 相符時，於同一 transaction 更新 CL/KN accepted baselines、canonical generation 與 generation cumulative counter，並遞增 reset count。任何 mismatch 或非 regression 狀態都 fail closed。

### 沿用 cumulative counter 與 carbon factor 契約

`MetricsAccumulatorService` 繼續只把 canonical combined `totalGeneration` 寫入 generation counter；不改變 Overview、Solar 或既有 counter 契約。Sustainability 的 factory-scoped story 則依目前 scope 讀取已驗證的 CL／KN source snapshot：單廠直接使用該廠 `total_mwh`，雙廠使用既有 combined canonical，兩廠皆未選時不產生數值。累積 CO₂ 為 `generationKwh × carbonEmissionFactor / 1000` tons；來源值為 MWh 時等價於 `scopedTotalMwh × carbonEmissionFactor` tons。植樹等效及其他由累積 CO₂ 衍生的 Sustainability 數值必須使用相同 scope。

### 播放設定的廠區啟用組合是 Sustainability 唯一 scope

不新增 Sustainability 頁內 selector。server 讀取 playback pages 中 `factory-circuit`（CL）與 `factory-circuit-guanyin`（KN）的 `enabled` 狀態，解析成四種 scope：只有 CL enabled 為 `CL`、只有 KN enabled 為 `KN`、兩者 enabled 為 `CL+KN`、兩者 disabled 為 `none`。播放設定更新後，既有 settings refresh／socket 流程必須讓 Sustainability 在下一次資料刷新時反映新 scope，不需要第二條設定或持久化欄位。

`none` 不得偷偷回退到 CL、KN 或 combined；story 回傳明確的未選擇狀態，頁面使用既有 `--`／不可用表達。這避免操作者停用兩個廠區後仍看到看似有效但來源不符的永續數字。

### 單廠與雙廠 scope 各自驗證來源完整性

CL scope 只要求 CL summary 的目標欄位 current、finite 且未 regression；KN scope 同理，未選取廠區的缺值或 stale 不得阻擋所選單廠。CL+KN scope 繼續要求兩廠完整並使用較舊 timestamp。任一 scope 不完整時保留該 scope 最後有效值並標示 stale，或使用既有 `--` fallback；不得以另一個 scope 的最後值冒充。

### readiness 與 provenance 顯示 scoped dependency

MQTT Settings 仍將 canonical combined generation 顯示為 derived，dependencies 是 CL 與 KN summary mappings。Sustainability readiness 另依播放設定 scope 評估：CL 只列 CL dependency、KN 只列 KN dependency、CL+KN 列兩者、none 顯示未選擇廠區。provenance source 分別標示 CL MQTT、KN MQTT 或 CL + KN MQTT aggregate；單廠 updatedAt 使用該廠 source timestamp，雙廠使用較舊 timestamp。

### 以 publisher 與 broker live witness 驗收

除了 focused tests 與 `pnpm verify`，完成必須執行 `solar_mqtt` once/test publish，使用 mosquitto subscriber 證明 CL/KN summary 與 scalar retained total 正確；再在 Pi 查 canonical live metrics、cumulative counter、Sustainability API 與 FHD witness。缺 zone fixture 必須證明 scalar retained total 未被覆蓋。

## Implementation Contract

- Publisher input: each factory receives one `summary` dict and one complete `zones` list from the same scrape cycle. Every zone total is a cumulative MWh reading that replaces its prior reading; messages are never added over time.
- Publisher output: valid cycles publish `solar/{factory}/summary` containing finite `total_mwh` and `solar/{factory}/total_mwh` with `{ "value": <finite MWh> }`, retained with existing QoS 1 behavior.
- Publisher failure: an invalid zone total omits summary `total_mwh`, skips scalar total publish, emits one bounded alert, and preserves the broker's previous retained scalar value.
- Subscriber inputs: `solar/CL/summary` and `solar/KN/summary`, with `today_mwh`, `month_mwh`, `total_mwh`, and source `timestamp`.
- Canonical outputs: finite combined `todayGeneration`, `monthGeneration`, and monotonic `totalGeneration` readings with normalized units and the older of the two factory timestamps.
- Reset interface: trusted `POST /api/settings/mqtt/factory-generation/reset-baseline` accepts a finite `expectedTotalMwh`; it succeeds only for the currently complete regression aggregate with an exact rounded match, otherwise returns a bounded 4xx result without mutating baselines or counters.
- Sustainability scope: enabled `factory-circuit` only → CL; enabled `factory-circuit-guanyin` only → KN; both enabled → CL + KN; both disabled → unavailable with explicit no-factory state.
- Sustainability outputs: accumulated generation equals the scoped factory total; accumulated CO₂ tons equals the scoped MWh value multiplied by the configured kgCO₂e/kWh factor; tree equivalence uses the same scoped CO₂ result.
- Concrete reference with factor `0.495`: CL `9986.306 MWh` → `4943.221 tCO₂`; KN `3659.570 MWh` → `1811.487 tCO₂`; both → `13645.876 MWh` and `6754.709 tCO₂`, after display rounding.
- In scope: publisher aggregation/retain/alert, Pi topic migration, dual-factory adapter, canonical metrics, readiness, counters, Sustainability provenance/calculation, app update and FHD evidence.
- Out of scope: source website changes, network/broker provisioning, zone topology UI, alternate CO₂ sources, layout/style changes and automatic counter reset acceptance.

## Risks / Trade-offs

- [A zone disappears entirely from the scrape response] → Validate against the factory's last successful zone-id set after it has been established; treat a missing previously known zone as incomplete and skip scalar total publication.
- [Retained messages arrive at different times after reconnect] → Require both factory summaries and use their embedded timestamps before updating canonical metrics.
- [Existing direct totalGeneration mapping overwrites derived data] → Migration disables old direct mappings and regression tests publish both old and new topics to prove only the derived path wins.
- [A legitimate meter reset lowers total_mwh] → Fail closed with a regression finding; require explicit operator reset handling rather than silently decreasing cumulative Sustainability values.
- [Playback numeric change lacks visual proof] → Run fresh Sustainability FHD witness even though no layout code changes.
- [兩個廠區開關皆關閉或在頁面顯示期間改變] → `none` fail closed；透過既有 playback settings refresh 重新解析 scope，且測試四種 enablement 組合。
