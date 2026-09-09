## 1. 建立 producer 到 response 的回歸

- [x] 1.1 核對最新 main／local HEAD，確認 D4 仍存在並記錄實作基準；維持本案無公開 API／SQLite schema 變更的邊界。
- [x] 1.2 加入 real production handler + fake broker 的 12.5 kW reception regression，與 guided identical-request replay 一起確認修復前 observed=true 的斷言失敗，而 live 更新及 energy row count=0 已成立。

## 2. 實作 source-bound power evidence

- [x] 2.1 將當次 admission 的完整來源 tuple 以內部型別傳遞到 runtime；測試證明身分來自 reviewed definition，不借用 MQTT payload 或事後同名來源。
- [x] 2.2 在成功提交 live update 後建立每 channel 有界最新 evidence，保存 receivedAt；以 source time 與 receipt time 不同、rollback、non-finite value、late／conflict／duplicate 測試驗證只有 qualifying update 能推進證據。
- [x] 2.3 讓 reception reader 按 measurementKind 分流並接到既有 guided response；以 1.2 轉綠、相同 receipt 不重寫 source/audit/receipt、原 response keys 不變驗證。
- [x] 2.4 加入 CL／KN 同名 key、不同 meter/channel、revision／epoch 切換與 old legacy live row fixtures；驗證不借用錯誤身分，失效 evidence 可清理且重複封包不形成無限歷史。
- [x] 2.5 加入同 runtime reconnect 與新 service restart cases，驗證 reconnect 不製造新接收、restart 保守 false、新有效更新才恢复 true，energy 的既有 persisted reception 不受影響。
- [x] 2.6 驗證 preview、SUBACK-only 與 rejected power 都不能產生 evidence，且所有 power cases 對 accepted energy、energy quarantine、meter baseline 維持零新增／零改寫。

## 3. 整體驗證與交付

- [x] 3.1 執行 `pnpm --filter @solar-display/server test src/routes/mqtt-guided-activation.test.ts src/mqtt/mqttPowerSelectorIngest.test.ts src/mqtt/mqttReviewedPowerOrdering.test.ts` 及本案新增的明確 regression 檔，記錄實際 red／green 與 shared build 結果。
- [x] 3.2 執行 `pnpm --filter @solar-display/web test`，核對既有 reception 文案能消費不變的回應形狀；完成 Standards／Spec review 後跑 `pnpm verify`，記錄實際輸出且不冒稱做過瀏覽器／真 broker 驗收。
- [x] 3.3 更新 review D4 的修復證據與 current-runtime 限制，執行 strict validation／read-back 並依 repo workflow 回報交付狀態；未實作或驗證前不勾選 task，commit 仍需使用者確認。
