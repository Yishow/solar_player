## Context

現在 `startServer()` 只在啟動時依 stored data mode 決定是否建立 `MockMetricsFeedService`。`PUT /api/settings/mqtt` 可以在執行中改 mode 並呼叫 `MqttClientService.connect()`，但沒有同時管理 mock feed lifecycle。另一方面，MQTT client 本身具有 reconnect 行為；初次 connect 失敗後若先停止 lease renewal 與 release lease、卻未終止 client，舊 client 仍可能稍後 reconnect。這些責任分散在 startup、route 與 MQTT service，使「目前真正的資料來源」沒有單一真相來源。

既有規格要求 broker settings 即使 reconnect 失敗仍要先持久化，因此本 change 不把「設定儲存成功」與「runtime activation 成功」綁成同一件事；而是把 desired configuration 和 active runtime source 分開。

## Goals / Non-Goals

**Goals:**

- 任何時間只有一個正式 metric producer：`mock` 或 `mqtt`。
- 設定保存與 runtime activation 分離，但兩者狀態都可觀察。
- runtime source 切換失敗時不留下雙寫、無來源或幽靈 reconnect client。
- restart 後依 persisted active/desired state 可重建正確 producer。
- 保留現有 MQTT broker/topic API 與既有 save-before-reconnect 契約。

**Non-Goals:**

- 不重做 MQTT payload parser、topic mapping schema 或 freshness policy。
- 不讓 mock 與 MQTT 同時寫正式 live store 做 blending；測試/preview 若需要雙來源，必須走隔離 store。
- 不在本 change 實作通知投遞。

## Decisions

### 引入單一 DataSourceRuntimeCoordinator

新增 server-owned coordinator，持有 mock feed 與 MQTT runtime lifecycle。startup 與 settings route 不再自行 start/stop producer，而是呼叫 coordinator。Coordinator 對外提供 `desiredMode`、`activeMode`、`transitionState`、`lastError`、`updatedAt`。

選擇單一 coordinator 而非在 route 裡補 if/else，因為 startup、runtime mutation、shutdown、restart reconciliation 與測試都需要同一套互斥規則。

### Desired 設定先存，Active mode 另外持久化

broker host、credentials、topic config 與 desired `dataMode` 延續現有 save-first 行為。另存 active runtime mode 與最近 activation 狀態。保存 desired mode 後，coordinator 嘗試 activation；失敗不回滾已保存的 broker config，但 active mode 保持原來源並回報 transition failure。

這可同時滿足「設定不能因 broker 暫時故障而遺失」與「畫面不能假裝已切換成功」。

### MQTT activation 先建立候選 client，再做安全交接

切到 MQTT 時先用候選 client 驗證 broker connection 與必要 subscription 能建立。候選成功後才停止 mock producer並升格為 active MQTT client。若候選失敗，立即 force-close 候選且 active mock 不變。

若現有 `MqttClientService` 無法同時承載 probe 與 active client，將 probe 封裝成獨立短生命週期 helper；不得讓候選取得正式 runtime lease後又在失敗時保持 reconnect。

### Lease release 必須晚於 client termination

任何 active MQTT client 要放棄 runtime lease前，先禁止 reconnect、detach/ignore stale handlers、`end(true)` 完成，再 release lease。所有 event handler 都以 client generation/token 驗證自己仍是 current client，舊 client 事件不得改寫新狀態。

### Partial update 以目前 persisted row 為基準

`resolveSettingsBody` 對每個 omitted field 都沿用 current persisted value。`dataMode` 僅在 body 明確提供合法值時改變；空 body 是 idempotent no-op，不得切 mode。

## Implementation Contract

**Observable behavior**

- mock → MQTT 成功：候選 MQTT ready 後 mock feed 停止，active mode 才變成 MQTT；之後不得再有 mock writes。
- mock → MQTT 失敗：broker settings/desired mode可保存，但 active mode 保持 mock，mock feed持續提供資料，UI顯示 activation failed。
- MQTT → mock：先停 active MQTT reconnect 與 subscriptions、關閉 client、釋放 lease，再啟動 mock feed；完成後 active mode為 mock。
- partial broker update省略 `dataMode` 時，desired/active mode皆不得因此改變。
- server shutdown 必須透過 coordinator 依序關閉 producer；restart 依 persisted active mode先恢復可用來源，再視 desired mode決定是否重試 transition。

**Acceptance criteria**

- unit/integration tests證明 mock→MQTT 後 mock timer被停止且不再寫 `live_metric_values`。
- MQTT→mock 不需 restart 即產生新 mock readings。
- connect failure 後候選 MQTT client被 force-close，不能在 lease釋放後再觸發 `connect` 成為 active。
- 兩個本機 runtime 競爭 lease 時任何時間最多一個 active MQTT runtime。
- empty/partial `PUT /api/settings/mqtt` 不改未提供欄位。
- management UI同時呈現 desired mode、active mode與 transition failure，不以單一文字掩蓋差異。

## Migration Plan

新增 active-source state 時，既有安裝第一次啟動以 stored `data_mode` 建立初始 desired/active 候選；若 stored mode 為 MQTT 但 broker不可用，active state 可為 `unavailable` 或依明確 fallback policy啟動 mock，不能默默把 mock 當成 MQTT。Migration 不改既有 broker secrets/topic rows。Rollback 時可忽略新增 state並回到舊 startup行為，但部署驗收前不得移除舊欄位。

## Risks / Trade-offs

- [Risk] 候選 MQTT 與 active MQTT 短暫共存造成 broker client-id衝突 → probe 使用獨立 bounded client id，正式 lease/client只在 handoff 階段建立或升格。
- [Risk] source switch 中間出現短暫無資料 → 先準備目標，再停止舊 producer；切換窗口保持有界並暴露 transition state。
- [Risk] desired/active 雙狀態增加理解成本 → UI固定同時顯示兩者與簡短原因，API型別使用明確欄位而非重載既有 `dataMode`。
- [Risk] stale client event覆蓋新狀態 → 每個 client handler綁 generation/token，只接受 current generation。
