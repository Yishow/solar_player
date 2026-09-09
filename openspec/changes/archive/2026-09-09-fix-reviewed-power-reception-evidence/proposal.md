## Why

最新 main `abd99ba846c25de35100229452e17e2442552a10` 的 guided reception 只查 accepted energy history，然而 reviewed power 按規格不寫入該表。隔離 production-handler 測試已確認 live 為 12.5 kW 時，reception 仍回 `observed=false`；這不是未收到封包，而是查錯證據種類，詳見 review D4。

## What Changes

- 能依量測種類讀取正確接收證據：energy 保留既有持久化讀值證據，power 使用正式接收服務已提交的有效 live 更新證據。
- power 證據綁定完整來源身分與 revision／epoch，不借用另一廠、另一來源或歷史版本留下的同名 live 值。
- 保留既有 `{ lastAcceptedAt, observed }` 形狀，區分 source observation time 與實際接收時間；SUBACK、預覽、拒絕封包與舊值都不能製造接收成功。
- 採本次 runtime 生命週期內的有界 power 證據；服務重啟後保守等待新的有效更新，不藉此新增持久化功率歷史或資料表。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `guided-mqtt-tag-mapping`: 補齊 reviewed power 的接收證據、身分隔離與重啟後保守狀態，energy reception 契約不變。

## Impact

影響 `MqttClientService` 的 post-commit power evidence、`mqttMeterIngest.ts` 的內部來源證據傳遞、`guidedMappingActivationService.ts` 的 reception reader，以及 `site-energy-profiles.ts` 的既有 guided apply 接線與對應測試。公開 API 與 UI 不新增欄位、不新增 broker 連線或 SQLite migration。

不把 power 寫入 accepted energy、quarantine 或 baseline；不改功率封包排序規則，不新增前端 polling、耐久功率接收日誌或 telemetry 平台。需跨 server restart 保留功率接收證据屬於獨立產品／schema 決策，不包含在本案。此 change 可獨立實作，本階段僅起草。
