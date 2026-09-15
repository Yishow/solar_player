# Design: Power publishing and KN onboarding

## Context

基準 main `fd405ebc2957232b6c622071622b9c7d830a3a42`；來源與變更差異見 [SOURCES](../../../docs/plans/data-hub-reception-ux/SOURCES.md)。程式命名 opc_mqtt 保留，但 active main.go 使用 internal/dde。電力 server 指上游 InTouch/SCADA 主機，不是要求 Player Fastify 直接讀取 DDE。

## Goals / Non-Goals

In scope：有界、可驗證的發布封包、topic／tag register、接收側驗證與 KN 導入門檻。Out of scope：本輪產品實作、現場啟用、實體點位猜測、修改能源計算算法、修改 Solar 已託管格式、部署或發送正式 MQTT。

## Technical Approach

### F1. 保留資料方向與所有權

Solar server → solar_mqtt_go → MQTT → Player SolarSourceAdapter。
電力 server（目前 InTouch DDE）→ opc_mqtt → MQTT → Player protocol gate → M2 reviewed source → E1/E2；E6 單獨決定總錶與部門。
詳細 topic／client 責任見 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md)。Player 管理連線不更改發布端或 Broker daemon。opc_mqtt 是 publisher，這個提案不為它加入 MQTT 控制訂閱。

### F2. 有版本的 topic 與來源登錄

詳見 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md) 及 [tag-register.json](../../../docs/plans/data-hub-reception-ux/tag-register.json)。正式 raw：opc/v1/{cl|kn}/raw/{tagId}；virtual：opc/v1/{site}/virtual/{virtualId}；diagnostic snapshot/status/heartbeat 分離。raw/virtual 預設 QoS 1、retain=false；snapshot 才 retained。Solar summary/whole-zone 既有 retain 行為不變。

publisherId 與 MQTT Client ID 必須部署唯一、重啟穩定；同一 site/topic owner 只有一個 active publisher。多 server 只有經登錄分配不重疊 tags，否則拒絕雙主；備援 failover 需獨立審核，不在本輪自動完成。tag label 可改、tagId 不隨名稱改；改實體點位需版本／epoch 審查。大小寫、namespace、site 與封包 register 一致，身分宣告本身不是驗證過的 publisher 身份。

### F3. 值、時間與品質

v1 保留 DDE 原始十進位字串後再計算；不先 float64、round 再 stringify。decimals 只供顯示。逐點保存 readAt、sourceTimestamp（可 null）、publishedAt、readStatus、sourceQuality；來源設備品質不存在就 unknown。單次批次成功不等於每個點都成功。舊版 ts 是發佈時間，不作 sourceTimestamp。

DDE 無來源時間時：sourceTimestamp=null；readAt 是採集證據，不能偽裝設備事件時間。E1 source-required 預設擋下；只有管理者明確審核該 source revision 的 allow-receive-time-estimate，且實際 production retain=false、dup=false、qos=0/1/2 時，才由 E1 使用 Player 的 receivedAt，仍標估計；封包不能自行開啟此權限。採集成功不證明上游裝置更新，未知品質限制必須另列於 review evidence，不能轉 good。

時間皆帶 offset/Z。readAt 至 publish/receive 的允許延遲、時鐘誤差、逐點 staleThreshold 在登錄審查，超限／無法驗證時隔離。初始 publish 30 秒、stale 90 秒是設計預設（30 秒沿用現行 defaults），不是現場 SLA；以現場更新頻率／延遲量測後調整。

### F4. 重送、失敗與虛擬值

每次成功實際讀取產生 sampleId，重送同次讀取保留 sampleId/readAt/sourceTimestamp；只有 publish time 可改。Player 以已授權 site/publisher/tag/sampleId 做持久、有界去重；不得只相信 MQTT DUP，也不以值相同判重（相同讀值可來自兩次真實讀取）。保留窗口至少覆蓋允許 replay age；超齡即隔離，不因去重紀錄清掉再接受。sampleId 不是 E1 實體身份／epoch。

初版不積壓離線讀值補灌；重連後重新採集，停更期間標 gap。失敗點不發布假 0/NaN/舊值換新時間；有限 diagnostic snapshot 可保留 last known value 與其原時間。virtual 一個成員失敗就整組 invalid，不部分加總；公式變更增加 publisherConfigRevision 並列 member tags。virtual lifetime sums 只作診斷／比對，不作 E1 物理累積錶；正式部門量從各 raw 已接受的區間資料透過既有 E6/E2 計算，避免某分錶 reset 或組員改變造成錯誤差值。

### F5. Player 整合的必要增補

新增有界 opc-power-v1 envelope validator，放在所登錄 topic 的 generic fallback 之前；schema/site/tag/publisher/config revision、unit、read status、時間、sample identity 驗證失敗即 diagnostics，不能改走 $.value 的弱驗證路徑。M2 預覽與 production 使用同一 validator，mapping 將 protocol profile、允許 publisher、tag 與 source revision 一併納入 canonicalDraft/token；需要新增 server/shared 欄位與測試，現況並不已支援。

validator 成功後才交 M2 selector path=[value]；timestampPath 只有真實來源時間才指定 sourceTimestamp，不指定 legacy ts/readAt/publishedAt。保留 transport retain/dup/qos/receivedAt/origin。quality unknown 的明示審查不得放寬 E1 的時間／transport gate；無法維持既有 admission 時停止啟用，不改造既有算法來讓畫面變綠。

### F6. 遷移與部署

中壢現有預設點位、10 組 virtual 及 20 raw 的對照均標 code-default-unverified；不是已查驗實體錶。先建立批准 register，再於隔離／shadow 模式比對 legacy 與 v1；接收側 canonical binding 原子切換。雙發時不能兩邊都寫 accepted；連續性以既有 revision/epoch 審查。舊 opc/中文名 topic 不在同次發佈中改義或刪 retained。

KN 執行步驟與資料缺口見 [KN-POWER-ROLLOUT](../../../docs/plans/data-hub-reception-ux/KN-POWER-ROLLOUT.md)。沿用 DDE 只在已證明存在 InTouch VIEW 的同登入 Session；沒有此條件就先選定 read-only acquisition adapter，不能因 repo 有 internal/opc 就宣稱 OPC 取數已接通。

## File Changes

opc_mqtt/internal/config/{config,defaults}.go：publisher/site/tag 登錄與版本協商；internal/dde/reader*.go：原始 decimal 與逐點時間；internal/engine/engine.go：exact decimal 與 member validity；internal/mqtt/publisher.go、main.go：v1、唯一 Client ID、bounded retry 與診斷。
Player：既有 MQTT dispatch、guidedMqttMappingService/mqttMeterIngest、source registry 與 shared mapping token 合約的 additive profile gate，復用現有解析／能源接收鏈，不多建一個可寫 canonical history 的 adapter。A–E 只消費這些能力；確切新檔名在 apply 時依最新 main 定位。

## Risks / Trade-offs

DDE 返回數字無法證明設備品質／事件時間；選擇明示 unknown 或經審核估計，不偽裝精確。legacy float precision 無法事後還原。新增 protocol gate 是必要實作成本，不將此案標成純 CSS。register 及示意封包不是部署 config。

## Validation

PM01–PM20、KN01–KN08 詳見共用驗收矩陣；測試要涵蓋 CL+KN client 同時在線、保留 replay、缺時間、同樣值不同 sample、同 sample 重送、單點失敗、虛擬缺成員、跨廠誤標、raw/virtual 雙算、切換 provenance、DDE 同 Session。Windows+DDE 與隔離 Broker 的真實證據必須另補；不得拿文件 lint 代替。

## Open Questions

KN 來源協定、實際 Item、物理錶號、CT/PT、時區、更新頻率、總用電／購電邊界與部門階層待現場提供。這些會阻擋對應點位啟用，但不阻擋本輪文件與未啟用的命名計畫交付。正式 CLI analyze/validate 與 runtime 驗收狀態見 REVIEW。

## Review clarification

空 virtual formula 必須 invalid；same sampleId 不同 body／acquisition evidence 必須衝突隔離。exampleOnly 封包只准離線 fixture；production gate 拒絕，不因貼例子就承認 KN 有來源。inflight MQTT retries 可重送同 sample，但不新增離線 domain-history 補傳；允許 replay age 以已審核設定為準，sample dedup retention 不短於它，超齡資料 fail closed。

發布端設定保存與 effective connection 必須分開：本提案不假設現有 opc_mqtt 主迴圈會在改 broker 後自動 reconnect；未實作可驗證熱切換時，明示需要同 Session 的受控重啟。unreportedQualityPolicy 預設 block；僅逐來源審核 allow-with-limitation 才能通過額外品質 gate，且不可放寬 E1 時間／transport 規則。
