# 電力發布契約與觀音接入計畫

## Why

使用者確認兩條資料流：solar_mqtt_go 擷取 Solar server 後發布 MQTT；opc_mqtt 由電力 server 取得資料後發布 MQTT；solar_player 訂閱並展示。最新 main 的 opc_mqtt 實際使用 Windows InTouch DDE view/tagname，仍以 opc 為預設 topic prefix，固定 Client ID，封包只有 value/unit/發布時間 ts。觀音點位尚未盤點；不能把中壢候選清單複製到 KN 就宣布完成。

## What Changes

- 定義既有 Solar 託管資料、電力 raw、publisher virtual 與診斷訊息的發布／訂閱責任。
- 提案新增 opc/v1/{site} 發布契約與逐點 tag register，保留 legacy topic 明確遷移而非原地改義。
- 補 per-publisher Client ID、精確數值、來源／讀取／發布／接收時間、品質、重送與斷線規則。
- 規畫 KN 現場盤點、最小資料接入、並行比對、計量審查與逐階段啟用；預留 tag 全部停用。
- 新增有界 v1 admission gate；其後重用既有 M2/E1/E2/E6，不重做能源算法、不建立第二條 accepted writer。

## Capabilities

### New Capabilities
- `power-mqtt-publishing-contract`：電力發布端到 Player 的有版本封包、命名、品質、遷移與接收守衛。
- `kn-power-onboarding`：待盤點的 KN 點位登錄、計量邊界與啟用門檻。

### Modified Capabilities
無；既有 UI 與 receiver ownership 的增補分別由 A–E delta 擁有，現行 meter-reading-contracts 保持約束。

## Impact

未來實作涉及 opc_mqtt config/DDE reader/engine/publisher、Player 既有 MQTT dispatch/preview/ingest 與 source registry、接收 profile 管理。確切檔案與接口見 design。這次只交付規格、計畫與離線例子，不修改 runtime、設定檔、現場 tags 或歷史。

## Non-goals

不把 DDE 當 OPC UA，不替 KN 虛構 Item/NodeId/IP/設備數，不把 Windows Session 0 Service 當目前 DDE 的部署方式，不遠端寫 PLC/SCADA，不開 Broker 全站掃描，不讓電力 virtual 與 raw 雙算，不把電网購電直接等同廠區總用電。
