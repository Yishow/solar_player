# MQTT 資料流與訂閱所有權

基準：main `fd405ebc2957232b6c622071622b9c7d830a3a42`。下列「現況」來自已讀程式，新增 opc/v1 是提案，不代表現在已發送。Source IDs S18–S30 見 SOURCES。

## 兩條資料流

Solar server → solar_mqtt_go 擷取 → MQTT Broker → solar_player server 訂閱 → SolarSourceAdapter → 展示。
電力 server（現況為 InTouch VIEW/DDE）→ opc_mqtt 讀取／計算 → MQTT Broker → solar_player server 訂閱 → 審查後來源 → 計量／展示。

「電力 server」不是 Player Fastify；同一台電腦執行也不會讓兩個程序共用設定。沒有新增 Player 直接 DDE/OPC 取數、沒有新增 opc_mqtt 控制訂閱。

## Client 與 topic 責任矩陣

| 擁有者 | 發布 | 訂閱／證據來源 | 誰可停止或變更 |
|---|---|---|---|
| solar_mqtt_go daemon | {prefix}/{SITE}/summary、zone/{id}、相容 scalar、status/heartbeat/alert、state/* | 只訂 configured factories 的 cmd/get-config、cmd/set；重連恢復 commands | collector 本身；Player 不改它的 config/帳密/prefix |
| solar_mqtt_go WebUI | 經自身授權的控制指令 | 自己的 summary/scalar/zone/#/health/state 監看；subscription-sent 非 Player 的 SUBACK | 該 WebUI client，不影響 Player |
| opc_mqtt bridge | 現況 {prefix}/raw/{id}、{prefix}/{virtualName}；提案新增 opc/v1/{site} | 無資料／控制訂閱；從 DDE 取數 | 上游 bridge 設定與其同登入 Session；不是 Player |
| Player production client | 正常接收流程不發布；現有診斷發送需獨立授權 | managed Solar filters + enabled reviewed power/generic topics 的 union | Player runtime reconciliation，保留其他來源與 managed filters |
| Player discovery client | 不發布、不建立正式讀值 | 只訂審核後範圍；獨立短期 client、每 filter/每 generation 證據 | capture stop/expiry 僅關自己的 client |
| Player candidate probe | 不發布、不改正式設定 | 只測候選連線，不證明訂閱或收到有效值 | 該 probe 完成／逾時清理 |

目前 Player Solar filters 為 solar/+/summary、solar/+/zone/+、solar/+/status、solar/+/heartbeat、solar/+/alert。標準 topic 的 SITE 為 CL/KN；metricScope 才是 cl/kn。collector prefix 可配置，但目前 Player adapter 固定 solar；非 solar prefix 不自動受支援，須明示 mismatch 或另有經審核的 adapter 擴充，不能自動變更 publisher。[S22–S24]

## 批准接收範圍與「看到」不是「接入」

Solar managed 檢視：使用現有 adapter snapshot；需要樣本時只對批准的 site summary 與 whole-zone filters 建立 discovery。status/heartbeat/alert 另標診斷；cmd/*、state/* 不是候選電錶。

新版電力：批准 opc/v1/cl/raw/+ 或 opc/v1/kn/raw/+；virtual/+ 及 status/heartbeat/snapshot 必須獨立標診斷，不納入 raw 候選數。這些是要新增的命名 profile，不是 main 已提供。現況 M1 固定 factory/cl/、factory/kn/；不匹配 opc 或 Solar，必須新增受控 profile 設定才談涵蓋。[S25]

legacy opc/ 沒有 site；只能依明確登錄的 publisher/namespace/實體來源關係給暫定 site，不能以使用者剛好選 KN 就改標成 KN。MQTT publisherId/tag/name 只是自述，不因可見就取得管理權限。延續受信任 LAN 模式，不把角色 ACL/TLS 升級變成此次必備部署條件；有既有授權時仍須遵守。

## Shared Broker 不等於 shared configuration

DataHub 的可寫欄位只屬 Player receiver。solar_config.json、opc_config.json、兩個發布端的 environment credentials、各自 WebUI 連線及 Broker listener/ACL 都不在保存範圍。

更改 Player A→B 之後，上游若仍發 A，B 即使顯示已連線也可能完全沒有資料。介面須提示「只更改接收端；發布端尚未移轉／未確認」，不能宣稱全系統已同步。正常操作不發 collector cmd/set；現行 collector allowlist 本來就不允許遠端改 broker host/port/credentials。[S24]

## 語意邊界

Solar canonical summary/whole-zone 不建立第二個 generic writer；非標準 Solar topic 在非託管 identity 下仍可經明確審查使用，不能一刀切封鎖所有 solar/*。OPC raw 才是可審查的單點量測；virtual 是計算結果，不是新實體錶。停 discovery、改 receiver、停 OPC publisher 是三個不同動作，必須分別顯示副作用。
