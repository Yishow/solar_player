# Publish tag 登錄與封包計畫

基準 main `fd405ebc`；完整機器可讀清單見 [tag-register.json](tag-register.json)。本檔是**提案，不是現場已啟用設定**。中壢候選沿用 opc_mqtt/internal/config/defaults.go 的 20 raw／10 virtual，現行程式沒有 site 欄位；本輪將其列入 CL 盤點計畫，不宣稱已確認設備歸屬或計量邊界。KN 目前沒有實際 Item 清單。[S18–S21]

## 1. 保持既有 Solar 契約

| 現行 topic | 內容／Player 用法 | 保護 |
|---|---|---|
| solar/{CL\|KN}/summary | total_power_kw→factoryGeneration.powerKw；today_mwh/month_mwh/total_mwh→對應 MWh 指標 | managed canonical；total_mwh 缺漏不補 0 |
| solar/{CL\|KN}/zone/{id} | power_kw、today_kwh、month_mwh、total_mwh、capacity_kwp、today_hours | whole-zone 唯一 canonical，不與 scalar 雙寫 |
| solar/{SITE}/total_power_kw、today_mwh、month_mwh、total_mwh；zone/{id}/{field} | 相容 scalar，不是另一顆物理錶 | 保留現況、不得搶 managed identity |
| solar/{SITE}/status、heartbeat、alert | 來源運作診斷；heartbeat 用 ts，summary/zone 用 timestamp | 不當數值電量、心跳不刷新量測時間 |
| solar/{SITE}/cmd/*、state/* | collector 控制／狀態 | 不出現在新增電錶候選，也不當測試發送預設目標 |

Solar summary/zone 目前可 retained，原始時間支配 freshness；新 OPC live retain=false 的提案不能反過來更動 Solar。Solar timestamp 既有 offset-free 限制另列環境／來源時區證據，不在此變更默改 parser。[S22–S24]

## 2. 新電力 topic 命名（提案）

| Topic | 用途 | QoS／retain |
|---|---|---|
| opc/v1/{site}/raw/{tagId} | 已登錄的單一原始電量／功率通道 | 1／false |
| opc/v1/{site}/virtual/{virtualId} | 上游算出的比較／診斷值，附 member tags | 1／false；不作 E1 物理累積錶 |
| opc/v1/{site}/snapshot/{publisherId} | 選配、過期有界的 last-known 摘要 | 1／true；只診斷 |
| opc/v1/{site}/status/{publisherId} | publisher/acquisition 狀態，可使用 LWT 標 offline | 1／true；不作量測 |
| opc/v1/{site}/heartbeat/{publisherId} | 存活時間及最近採集摘要 | 1／false；不作量測 |

site 精確 cl/kn；raw tagId 使用批准的 `[A-Z0-9_]+`，virtual/publisher IDs 使用 `[a-z0-9-]+`。禁止斜線、wildcard 或空白自動拼出新的實體通道；顯示名稱另存，改名不改 topic。prefix 未匹配批准契約就報錯，不默猜或全站掃描。

每個部署設定唯一、重啟穩定的 Client ID，例如 opc-cl-<stable-id>／opc-kn-<stable-id>；這是命名樣式，不是可直接啟用的設定。**目前固定 opc_mqtt_bridge 必須先改為可配置／持久產生，才能安全上第二個 publisher。**相同 site/tag 只有一個 active publisher；多主機需不重疊 tag 所有權，不能靠不同 Client ID 掩飾 topic 雙主。[S20]

## 3. CL 原始點位候選：保留 20 個現有代碼

以下 Source Item 是程式預設 DdeItem，不是現場量測證明。legacy raw prefix 為 opc/raw/；提案 topic 為 opc/v1/cl/raw/ 加相同 tagId。單位計畫正規化為 kWh，measurementKind 待確認 cumulative-energy；角色、CT/PT、meterId、source timestamp/quality 都須逐筆審核。

| tagId／預設 DdeItem | 程式描述摘要 | 預設分類（不是已批准電氣拓樸） |
|---|---|---|
| `GCB_610_KWH` | 69kV 主控制盤 | 總量 |
| `TIE_VCB_KWH` | TIE-VCB | 未分組／先診斷 |
| `VCB_12_1_KWH` | WG+WE 變台 VCB#12 | 車身 |
| `VCB_12_2_KWH` | Line 1 電容器盤 VCB#12 | 未分組／先診斷 |
| `VCB_13_KWH` | WM 變台 VCB#13 | 車身 |
| `VCB_14_1_KWH` | 瑞菁館變台 VCB#14 | 事務 |
| `VCB_14_2_KWH` | SPARE VCB#14 | 未分組／先診斷 |
| `VCB_15_KWH` | PA+PB 變台 VCB#15 | 沖壓 |
| `VCB_16_KWH` | WA+WB+WQ+WD 變台 VCB#16 | 車身 |
| `VCB_17_KWH` | Line 1 主斷路器 VCB#17 | 一製 |
| `VCB_4_KWH` | Line 2 主斷路器（程式描述 VCB#17，待現場核對） | 二製 |
| `VCB_5_1_KWH` | TA 變台 VCB#5 | 塗裝 |
| `VCB_5_2_KWH` | 原動力變台 VCB#5 | 原動力 |
| `VCB_6_KWH` | TB 變台 VCB#6 | 塗裝 |
| `VCB_7_1_KWH` | 事務棟變台 VCB#7 | 事務 |
| `VCB_7_2_KWH` | AA 變台 VCB#7 | 裝配 |
| `VCB_8_1_KWH` | SPARE VCB#8 | 未分組／先診斷 |
| `VCB_8_2_KWH` | KRDC 變台 VCB#8 | KRDC |
| `VCB_9_1_KWH` | TC 變台 VCB#9 | 塗裝 |
| `VCB_9_2_KWH` | Line 2 電容器盤 VCB#9 | 未分組／先診斷 |

`VCB_4_KWH` 的 code description 寫 Line2 VCB#17，與代碼不同；保留差異交現場核對，不替使用者「修正」成猜測的盤號。GCB 是總量候選，但不能只憑名稱認定它涵蓋自發自用、全廠負載或是有效 E6 分母。

## 4. CL virtual 對照：10 組既有計算，不多算一次

| 新 virtualId | legacy topic | 現有 raw 成員（加總） |
|---|---|---|
| `site-total` | `opc/總量` | GCB_610_KWH |
| `body` | `opc/車身` | VCB_12_1_KWH + VCB_13_KWH + VCB_16_KWH |
| `office` | `opc/事務` | VCB_14_1_KWH + VCB_7_1_KWH |
| `stamping` | `opc/沖壓` | VCB_15_KWH |
| `line1` | `opc/一製` | VCB_17_KWH |
| `line2` | `opc/二製` | VCB_4_KWH |
| `paint` | `opc/塗裝` | VCB_5_1_KWH + VCB_6_KWH + VCB_9_1_KWH |
| `utilities` | `opc/原動力` | VCB_5_2_KWH |
| `assembly` | `opc/裝配` | VCB_7_2_KWH |
| `krdc` | `opc/KRDC` | VCB_8_2_KWH |

這是 defaults.go 的公式盤點，不是已確認部門用電規則。virtual 全部為 calculation-only：任何成員失效就整組 invalid；公式版本／成員資料時間要顯示。不得計算「GCB + 全部部門 + virtual」或把一製／二製與其子盤一起加總。某 raw 換錶或 reset 也不得讓 virtual lifetime sum 的落差被當用電。正式部門、總錶與 shareBasis 保留 E6，區間數據由 raw 的 E1/E2 計算。[S19/S21/S26]

## 5. KN 邏輯 tag 預留（全部停用）

| 預留 tagId | 目的／語意 | 單位 | 計畫 |
|---|---|---|---|
| `SITE_LOAD_KWH` | 全廠負載累積用電（有實體邊界證據才成立）；cumulative-energy／consumption | kWh | 優先核對；沒有完整邊界就保持不可用 |
| `GRID_IMPORT_KWH` | 電網購入累積電量；cumulative-energy／grid-import | kWh | 可獨立先上，但不叫全廠總用電 |
| `SITE_LOAD_KW` | 全廠即時有功功率；power-gauge／consumption | kW | 選配；必須真有功率量測 |
| `GRID_EXPORT_KWH` | 電網回送累積電量；cumulative-energy／grid-export | kWh | 選配；有反送／自用率需求再盤點 |
| `FEEDER_<ID>_KWH` | 已確認饋線累積用電；cumulative-energy／consumption | kWh | 第二階段；每顆錶替換 <ID> 並核對重疊 |
| `FEEDER_<ID>_KW` | 已確認饋線有功功率；power-gauge／consumption | kW | 第二階段選配；不由累積 kWh 直接改單位 |

上述 topic 為 opc/v1/kn/raw/ 加預留 tagId。`<ID>` 是**不可發送的模板**，必須先替換成已登錄的真正邏輯 ID。每列 sourceItem=null、meterId=null、enabled=false；不填假的 PLC address、OPC NodeId、DDE Item、廠區 IP、分錶數量或數值。對應完整步驟見 KN-POWER-ROLLOUT。

## 6. v1 raw 封包

規劃範例見 [examples/power-reading-v1.json](examples/power-reading-v1.json)，是離線人工例子，不能 publish 到正式環境。

| 欄位 | 要求 |
|---|---|
| schemaVersion／producer／kind | 1／opc_mqtt／raw；不支援的版本阻擋啟用 |
| site／publisherId／tagId | 必須與批准 registry 及 exact topic 一致；payload 自述不等於身份驗證 |
| publisherConfigRevision | 發布端點位／公式配置版本，不是 Player config revision、E1 sourceRevision 或 meter epoch |
| sampleId | 每次實際採集產生；同一採集的重送保持不變，重啟不重用新資料的 ID |
| value／unit／measurementKind／energyFlowRole | value 為精確十進位字串；其餘與審核過的來源定義一致，不由名稱猜 |
| sourceTimestamp | 真正來源事件時間，無則 null；不把 readAt、publishedAt、legacy ts 填進來 |
| readAt／publishedAt | 逐點成功讀取時間／本次發送時間，各自帶 offset/Z；cache 重送不改 readAt |
| readStatus／sourceQuality | readStatus=ok 才可作量測候選；DDE 沒設備品質則 sourceQuality=unknown，不捏造 good |

actual MQTT retain/dup/qos 與 Player receivedAt/origin 由接收端 transport 取得，不相信 payload 自報。合法 raw value、schema/site/tag 正確，也不等於必定進 E1；source-required 仍要求可信 source time。沒有 source time 的 DDE 通道只有經逐 source revision 審核 allow-receive-time-estimate、真實非 retained/non-dup production packet 才走既有受限估計，仍保留 unknown device quality 的限制；source timestamp 不變成 receiver time。[S26/S27]

## 7. 運行、精度與遷移

30 秒發布／90 秒 stale 是初始提案，需按逐點實際更新週期與延遲調整；不可把所有慢速電錶判斷為同一固定品質。先量測時鐘誤差與 read-to-receive age，再訂批准上限；超限／無法驗證採隔離。相同 value 可是新讀取，sampleId 才識別重送；去重持久窗口至少覆蓋批准 replay age，窗口外不補灌。

目前 DDE/engine/state 用 float64，virtual 會 round，publisher ts 是發布時重建；v1 必須把原始 decimal lexeme 從 DDE reader 一路保留，不能只替 JSON 增加幾個欄位就宣稱完成精確計量。原來已捨去的精度不能重建；legacy 數據限制保留在遷移紀錄。[S20/S21/S28]

無新成功 read 不產生新量測；item failure 不發假 0／舊值新時間。空的 virtual formula 應判 invalid，不能輸出總量 0。第一版不做離線歷史排隊補傳；斷線恢復先重新取樣，UI 標 gap。publisher ACK、receiver SUBACK、收到包、解析成功、E1 accepted 分別驗證。

先保留 legacy opc/{中文名} 與 opc/raw/{ID}，加 v1 shadow，比對後經 E 的 guarded writer 切換同一物理 channel 的唯一 accepted binding。active/legacy 不同 topic 不能被當成不同物理錶重複算。回退只關新 routing，不刪歷史或清除 retained Solar；也不偷偷降回盲目全量覆寫。

sourceQuality 未提供時，額外協議 gate 的 unreportedQualityPolicy 預設 block；allow-with-limitation 必須逐來源審核、記錄風險並綁 protocol/source review revision，不是封包自報可用。發布端 broker／Client ID 等連線設定若尚無可驗證熱切換，就標 restart-required，不因保存成功顯示新連線已生效。
