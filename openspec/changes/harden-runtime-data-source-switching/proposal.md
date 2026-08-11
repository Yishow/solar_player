## Why

目前資料來源模式同時存在「儲存設定」與「實際執行中的 producer」兩層狀態，但 mock feed lifecycle 只在 server startup 決定一次。執行中從 mock 切到 MQTT 時，既有 mock feed 可能繼續寫入 `live_metric_values`；反向切換時則可能沒有 mock feed 可用。此外，partial MQTT settings update 在省略 `dataMode` 時會默認成 `mqtt`，初次 MQTT connect 失敗時也可能先釋放 runtime lease、卻沒有先終止仍可自動重連的 client。這些情況會讓畫面顯示的資料來源與真正寫資料的來源不一致，直接破壞監控數字可信度。

## What Changes

- 新增 runtime data-source lifecycle，明確區分 desired configuration 與 active producer，任何時間只允許一個 production metric producer 寫入正式 live store。
- mock → MQTT 與 MQTT → mock 改成有狀態的切換流程；先準備目標來源、確認可用條件，再停舊來源並完成 activation；失敗時保留或恢復舊來源。
- MQTT settings partial update 未帶欄位時保留既有值，尤其 `dataMode` 不得因省略而隱式改成 `mqtt`。
- MQTT client 在放棄 runtime lease 前必須確定自身已停止且不能再自動重連；standby/lease retry 也必須遵守單一 active client 契約。
- 管理頁顯示 desired mode、active mode、transition state 與最後失敗原因，避免「設定已存」被誤解為「來源已切成功」。
- 補 mock↔MQTT 熱切換、partial update、connect failure/lease handoff 與 restart reconciliation 的 server regression tests。

## Non-Goals

- 不更換 MQTT library、SQLite 或 Socket.IO。
- 不在本 change 實作一般化 anomaly detection 或通知中心；它們由後續 change 處理。
- 不改 topic mapping 的業務欄位或現有 metric contract。

## Capabilities

### New Capabilities

- `runtime-data-source-switching`: 管理 mock 與 MQTT producer 的互斥 lifecycle、preflight、activation、rollback、restart reconciliation 與可觀測狀態。

### Modified Capabilities

- `mqtt-settings-operations-surface`: partial settings update 必須保留未提供欄位，且操作介面必須區分 desired source 與 active source/transition 結果。

## Impact

- Affected specs: `runtime-data-source-switching`, `mqtt-settings-operations-surface`
- Affected code: `apps/server/src/server-startup.ts`, `apps/server/src/services/MockMetricsFeedService.ts`, `apps/server/src/mqtt/MqttClientService.ts`, `apps/server/src/routes/settings-mqtt.ts`, MQTT settings web view/model、shared runtime status types 與對應 tests。
- Affected data: 需要一個可持久化的 active/desired source runtime state；既有 broker/topic 設定維持相容。
- Dependency: 後續 `add-data-health-and-operator-alerting` 可直接消費本 change 的 active-source provenance。
