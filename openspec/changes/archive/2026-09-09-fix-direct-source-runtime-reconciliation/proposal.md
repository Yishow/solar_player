## Why

最新 main `abd99ba846c25de35100229452e17e2442552a10` 的一般來源管理只同步資料庫中的 enabled，沒有把新的訂閱集合交給執行中的 MQTT 服務。隔離 HTTP／runtime 測試已重現：停用狀態下啟動服務，再 PUT 重新啟用，HTTP 200、source 與 mapping 都為 enabled，但目標 topic 未訂閱且 subscribe 呼叫數不變；詳見 review D3。

## What Changes

- 一般來源管理成功提交後，使用已提交的完整 enabled mapping 集合協調正式接收訂閱，與導引路徑維持同一個 runtime owner。
- 重新啟用不需重啟服務；停用或移動來源不得取消其他來源仍使用的共用 topic。
- broker 不可用時保留已提交設定、記錄可診斷的協調失敗；不把設定保存等同資料已收到，不回滾已成功的 database transaction。
- 保留既有 `{ source }` 成功回應、HTTP 狀態與管理權限；拒絕寫入不接觸 runtime。補上正式路由加 fake-broker 的回歸矩陣。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `meter-reading-contracts`: 補齊一般來源生命週期變更提交後的訂閱協調、失敗與重試契約。

## Impact

主要影響 `apps/server/src/routes/meter-sources.ts`、既有 runtime 訂閱協調的最小共用接點與來源路由測試。沿用 `MqttClientService` 的 desired／active 訂閱分工，不新增第二個 MQTT client、不修改 broker 設定、topic 結構、資料表或公開 API 形狀。

不重做 guided token／receipt、不擴充 mapping 改名或 transport 編輯功能、不新增管理畫面或部署流程。本案可獨立實作；來源 impact 修復若尚未套用，runtime 回歸使用無依賴且合法的來源 fixture。
