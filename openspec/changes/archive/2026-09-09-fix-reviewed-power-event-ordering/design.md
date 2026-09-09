## Context

動機與實測見 `proposal.md`、review F2。`mqttMeterIngest.ts` 的 power 分支先通過 selector、admission、scale 與 timestamp parsing，然後無條件回 `liveUpdated=true`。`MqttClientService.ts` 在同一交易中把它寫入 `live_metric_values`，upsert 沒有時間先後條件。累積電量的 `meterReadingService.ts` 已有晚到判斷；功率刻意不進 energy history，不能直接挪用 energy baseline 當排序記憶。

## Goals / Non-Goals

**Goals:** 沿用目前 live row 的時間證據，把 reviewed power 的判斷與寫入變成不可被抵達順序打亂的一個動作；重啟後保留結果。

**Non-Goals:** 不另存完整 power history、不建立重排佇列、不修改能源差值演算法；不自動修正未來時間、上游時鐘或不同來源 revision 的時鐘重設，也不變更 legacy mapping 的語意。

## Decisions

### 1. 使用 persisted live destination，而非 process-local 記憶

在現有 live persistence 交易內讀取相同 `(metric_scope, metric_key)` 的 `value/unit/timestamp/quality`，比較 parsed UTC instant。`sourceTimestamp` 必須來自既有 admission 結果；只有已核准的 receive-time estimate 可用該次原始 receivedAt，且 quality 不升級。

不採用記憶體 latest map，因為重啟便會失去保護；不新增 power ledger，因為既有 live row 足以修復此次目的時間軸倒退問題。使用 JavaScript 的有效時間解析或等效 normalized instant 比較，不以 SQL 字串大小比較不同 offset 格式。

### 2. 小範圍連接 power 判定與既有原子 upsert

保留 selector/admission/scale 的共用流程，在 reviewed power 將要寫入 live row 的邊界加入排序判斷，並使當次 `mappedLiveUpdated` 只在真正完成寫入時成立。優先以小 helper 封裝 pure ordering decision，runtime 負責同一交易的讀寫；若需要內部型別區分 power 與 energy，僅新增內部型別資訊，不更動 public API。

判定不得只是改回傳訊息而仍執行 unconditional upsert，也不能在 commit 後才發現過期。測試必須走實際 production callback，保護不只存在於可單獨測試的 helper。

### 3. 明確處理 older、equal、newer

沒有有效 prior observation 時允許第一筆合法值。候選時間較新才更新；較舊時保留整列資料並記錄不含 raw payload/credential 的 late-observation 診斷。同時刻 normalized value 與 unit 相同為無寫入 replay；不同為 collision 診斷。沿用目前 generic live metric 的數值表示限制，不藉此引入 power decimal schema 或聲稱比現有欄位更高的持久化精度。

相等時間不得以新 receivedAt 更新 freshness，也不得改寫 quality 或 raw payload。必要 diagnostic 可由目前 logger 或內部 ingest result 提供；不新增 energy quarantine rows。外部只依真正變更決定 derived recalculation；現有廣播若仍送出相同 snapshot，其 timestamp/freshness 不得變動。

### 4. 目的時間軸跨 source revision 保持單調

新 revision 或來源換機本身不清除現有 destination 的有效時間。上游時鐘落後需由明確的另外操作處理，不能讓每個 mapping revision 都成為繞過保護的開關。不同 scope/key 完全分開；累積電量既有 revision/epoch continuity 與 late-event 保存不變。

## Risks / Trade-offs

[現有資料含未來時間，單調 guard 可能暫時阻止後續較早封包] → 本案不自動清除或改寫既有觀測；留下可診斷原因。未來時間 admission/修復工作另行定義，不以放寬排序掩蓋。

[legacy live row 的 timestamp 可能是接收時間而非來源時間] → 以當前 persisted destination timestamp 為保守基準，不假裝已建立新的歷史來源證據；未經審查的 legacy 寫入路徑不改。

[先比較再非原子寫入會有競爭] → 檢查與 upsert 同一既有交易，測試 handler 與重啟使用同一 temporary database 的狀態，不只測 pure helper。

[忽略舊封包卻仍刷新下游] → 驗證 raw live row、derived-change sink 與 socket payload；允許內容不變的廣播，但不允許變新時間或重新計算成不同值。

## Migration Plan

無 schema migration、無既有資料重播。Apply 先把 F2 改寫為應保持 20 kW 的 failing regression，再實作並回歸首筆／較新、等時刻、不同時區表示、來源時間缺失政策、known-time retained、重啟及站點隔離。跑 focused ingest/runtime tests 與當下 `pnpm verify`；不使用正式 broker 發送測試污染計量。

本提案不部署。實作回復可只回復程式修補，live/energy 資料不刪除；已被覆寫的舊 live 值不憑空補回，等待合法新觀測。
