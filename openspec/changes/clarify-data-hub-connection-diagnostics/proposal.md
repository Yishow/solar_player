# Solar Player 接收端：共享連線狀態與草稿測試

## Why

Connections 已將中央 Broker 標示為共享基礎設施，也有正式狀態與測試回饋卡，但捷徑用無 query 的原生 anchor。GuidedOnboardingPanel 的「測試連線」目前只 GET 設定/狀態；真正的 POST `/api/settings/mqtt/test` 已存在。使用者容易把「目前 Broker 正常」「新填的設定已測試」和「某個廠區的資料正常」看成同一件事。

## What Changes

- 分開正式運作狀態、待儲存設定及該設定的最近測試。
- 定義檢查狀態／測試草稿／儲存並重新連線三種不同動作。
- 顯示共享影響、資料模式、最後確認時間與證據不足時的 unknown。
- 測試結果綁定設定版本；變更設定後旧成功不能沿用。
- 所有前往 sources/metrics 的捷徑保留允許的 scope 與返回脈絡。

## Capabilities

### New Capabilities
無。

### Modified Capabilities
- `data-hub-management-surface`：強化中央 Broker 的可編輯／測試／生效狀態契約。

## Impact

ConnectionsView、ConnectionStatusCard、BrokerForm、相關 controller、GuidedOnboardingPanel、settings-mqtt test/save response 與 shared status 型別。機密遮罩既有規則保持；新 telemetry 未提供時只能顯示未知。

## Non-goals

不新增多 Broker、不把廠區 filter 當授權、不實作一般網路掃描、不宣稱 DNS/TCP/TLS 各步驟已測量、不以連線成功代表資料正確。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

本頁只改 Solar Player 的接收端設定；不會修改 Broker 服務本身、solar_mqtt_go、opc_mqtt 或兩者 WebUI 的設定。發布端健康與本接收 client 狀態分開。
