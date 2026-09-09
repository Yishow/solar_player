## Context

動機見 `proposal.md` 與 review D4；基準 `abd99ba846c25de35100229452e17e2442552a10`。`readGuidedMappingReception` 只查 `meter_readings_accepted`，power 卻正確地只更新 `live_metric_values`。後者沒有 meter/channel/revision/epoch，不能直接拿任一同名 live row 當新來源的接收證明。`MqttClientService.handleMessage` 已在同一 transaction 中完成 admission、power ordering 與 live upsert，這是建立可信接收證據的既有接點。

## Goals / Non-Goals

**Goals:** 使同一 runtime 中的有效 power live 更新能在 guided apply／receipt replay 的既有 reception 欄位被讀到，且完整隔離來源身分。保持 public response、power ordering 與 energy history 行為。

**Non-Goals:** 不新增 SQLite migration、耐久 power log、跨重啟歷史接收保證或前端 polling，不把 power 塞入 accepted energy/quarantine/baseline，也不調整現有累積用電計算。

## Decisions

### 1. 由 production admission 傳遞完整內部身分

讓 `ingestMappedMeterReading` 的 reviewed-power 結果攜帶最小且不可變的內部 source identity：metricScope、metricKey、meterId、channelId、sourceRevision、epochId。身分來自當次成功解析的 reviewed definition，不從 MQTT payload 信任客戶端自稱身分，也不在稍後用「目前同名 source」補猜。

這只是 server 內部結果型別，不加入 HTTP response 或將私有資料回傳瀏覽器。energy／legacy 分支不藉此改變 admission 或 event 行為。

### 2. 只有成功提交的 live update 建立證據

在 `MqttClientService` 的 live transaction 成功返回、`mappedLiveUpdated` 為 true，且 measurementKind 是 power-gauge 時，更新該 source 的 runtime evidence。證據包含 actual receivedAt，與 live observation timestamp 分開。transaction rollback、non-finite live value、admission rejection、late、equal-instant conflict、duplicate no-op、preview 或僅 SUBACK 都不能建立或推進證據。

替代方案是在 `ingestLivePowerReading` 一回 accepted 就記錄，但後面的排序或 live transaction 還可能拒絕，因此不採用。也不以 energy-history insert 做 workaround。

### 3. 以 bounded current-runtime evidence 避免 schema 擴張

接收服務維護每個 `(metricScope, channelId)` 至多一筆最新完整 source identity 與 receipt time。讀取必須比較完整 tuple；來源設定已被取代時，不得把舊 tuple 當新的證據。以當前來源 catalog 核對並移除不再適用的紀錄，不按每個封包或歷代 revision 建立無限長集合。證據只含身分與時間，不保存 raw packet。

同一 service 的 broker reconnect 可以保留仍匹配來源的既有證據，但 reconnect 本身不推進 lastAcceptedAt。建立新 service／server restart 時集合為空；保守 false 直到新一次符合既有 ordering 的 live update。這是有意選擇的生命週期邊界，不宣稱 persisted live row 能證明當前 source，也不把未實作的耐久證據列成開放問題。

若未來確有跨 restart 接收稽核需求，应另案設計 durable source-bound observation metadata 並經 schema 變更審查，不能在本修復順手挪用 audit 或 energy tables。

### 4. Reception reader 按量測種類分流

`readGuidedMappingReception` 內部參數取得 requested source 的 measurementKind、metricKey 與完整身分，並注入 production runtime 的只讀 power-evidence accessor。power 讀不到有效同身分證據就回既有 false/null；energy 繼續使用目前 exact-identity accepted query。`site-energy-profiles.ts` 在原本 post-commit activation 後的 reception 組装接入 accessor，HTTP envelope 不變。

沒有 runtime evidence provider 的 isolated service/test 場景採保守 false，不能 fallback 到任意 generic live row。已保存 receipt replay 只重新讀 runtime 狀態，不重放預覽資料、不重寫 source/audit/receipt。

### 5. 從 producer 到既有 response 驗證

正式回歸要同時確認 value=12.5、actual receipt time、response observed=true，以及 accepted/quarantine/baseline row counts 都未被 power 改動。fixture 使用 fake broker callback 進入真正 runtime；HTTP replay驗證既有 consumer 能取得 evidence。另測不同 source timestamp／receivedAt、same key different scope、new revision/epoch、old legacy live row、reset runtime、energy evidence 持久化，以及 rejected/late/conflict/duplicate 無副作用。

## Risks / Trade-offs

- [重啟後 UI 暫時顯示尚無 power 證據] → 明確保守邊界；有新有效 live update 即恢復，不冒用缺乏來源身分的舊資料。這不是 durable power history 方案。
- [在 transaction 完成前提早更新記憶體造成假成功] → 僅在成功提交後更新並以 rollback fixture 驗證。
- [source revisions 使 evidence 膨脹或串錯來源] → 每 channel 有界最新證據、完整 tuple 比對、catalog 核對與 stale-entry cleanup tests。

## Migration Plan

不修改既有 SQLite schema／資料、不需要歷史回填。apply 先跑 red regression，接好 evidence producer、reader 與既有 HTTP consumer，再跑 focused server 與相鄰 web result tests，最後 `pnpm verify`。回滾只移除 runtime evidence 接線；既有 energy history、power live row 與來源設定保持原樣。本階段不執行部署或資料異動。
