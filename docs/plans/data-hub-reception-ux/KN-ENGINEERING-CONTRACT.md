# 觀音工程別：發布端與 Player 的交接契約

2026-09-16，基準main `818fa0da`；對應G `add-kn-engineering-mqtt-sources` 的KNE/EPR要求。**只有工程別主軸是使用者已確認；下列新payload、energy topic、額度是規格提案，不是已部署或已收到的實樣。** 每個來源先選其實際mode，不要求同時發三種資料。

## 1. 八工程與既有功率對照

| 工程 | ID | 現有seed功率topic（kW） | 現有語意metric（scope=kn） |
|---|---|---|---|
| 沖壓工程 | `stamping` | `factory/guanyin/power/stamping` | `factoryCircuit.stampingPower` |
| 車身工程 | `body` | `factory/guanyin/power/body` | `factoryCircuit.bodyPower` |
| 塗裝工程 | `painting` | `factory/guanyin/power/painting` | `factoryCircuit.paintingPower` |
| 裝配工程 | `assembly` | `factory/guanyin/power/assembly` | `factoryCircuit.assemblyPower` |
| 原動力 | `utility` | `factory/guanyin/power/utility` | `factoryCircuit.utilityPower` |
| 事務系 | `office` | `factory/guanyin/power/office` | `factoryCircuit.officePower` |
| 大車工程 | `heavy_vehicle` | `factory/guanyin/power/heavy_vehicle` | `factoryCircuit.heavyVehiclePower` |
| ED電著 | `ed_coating` | `factory/guanyin/power/ed_coating` | `factoryCircuit.edCoatingPower` |

工程ID與seed/spec一致；seed不是Broker現場證據。paint/painting、utilities/utility不得默認別名。工程名稱可改，ID／歷史不變。實體meter/DDE/CT/PT留上游，Player只需要工程成果的定義摘要、範圍、版本與發布責任。

## 2. 正式topic與訂閱

| mode | exact-topic樣式 | 值與計算 | QoS / retain建議 |
|---|---|---|---|
| power-gauge | factory/guanyin/power/{engineeringId} | kW，真觀測瞬時／工程加總功率；不積分成日kWh | 1 / false，保留既有部署時先核對 |
| daily-report | factory/guanyin/energy/daily/{engineeringId} | kWh，上游已算好的完整日結果，跨日相加 | 1 / 可選true僅供最新一期；有原period也不代表多日歷史 |
| cumulative-energy | factory/guanyin/energy/cumulative/{engineeringId} | kWh，穩定工程口徑的累積計數，同epoch/definition差分 | 1 / false；可信時間retained需經明確profile批准 |

新energy namespaces不得原地改既有power topic的單位。能配其他既存topic時也需精確登錄/版本審核，不由UI自作主張搬topic。正式訂閱由enabled registry產生exact topics；一次停一工程不動其他工程／Solar／physical owners。新的discovery群組只涵蓋批准模式與八個ID；查不到流量不表示工程不存在。receiver不改上游publisher或Broker設定。

## 3. Registry 必須先確認什麼

不可變sourceRef＋configurationRevision；site、engineeringId、purpose、mode、exactTopic、unit、scaleDecimal、definitionRevision及生效日、definition摘要、scope coverage、approved publisher與切換／歷史更正權限、calendarRevision、expectedDelivery、qualityPolicy、replayWindow與historyRetention。unknown欄位可存draft、不可通過依賴該欄位的activation。八工程範本均mode=null、publisherId=null、enabled=false，與上游的待發送承諾分開。

definition描述工程範圍／計算口徑，不需全量底層點表。既已換算成kWh的成果以scaleDecimal=1交接；其他單位可在明確的新來源版本轉換一次，但不得兩端重複套倍率。E1的meterRole/departmentId限制不透過假meter解除；會計歸屬只在版本化profile。

## 4. Daily v1 欄位（提案）

| 欄位 | 型別／限制 |
|---|---|
| schemaVersion | integer 1 |
| sourceKind / mode | engineering / daily-report |
| site / engineeringId | kn／八工程allowlist；需與topic一致 |
| publisherId | 1–64字元 `[a-z0-9-]+`；批准身份的宣告，不是認證本身 |
| definitionRevision | 正整數；對應period有效工程定義，不是每次發布自增 |
| calendarRevision | 正整數；對應site timezone／日界生效版本 |
| measurementKind / unit | interval-energy / kWh；不接受kW、kvarh混入 |
| value | 非負十進位字串，最多64字元和9位小數，不接受exponent/NaN/Infinity；無值是null |
| periodStart / periodEnd | RFC3339 offset/Z，正規化成UTC；site calendar兩相鄰午夜的[start,end) |
| periodStatus | preliminary / final / withdrawn |
| coverage | complete / partial / unknown |
| quality | valid / partial / invalid / unknown；是上游工程結果品質，不假造設備Good |
| dataRevision | 正整數；同工程同期間更正版，重送不增加 |
| publishedAt | 真發布時間；不決定所屬日期、不進duplicate digest |
| reason | 除第一版final/complete/valid外必填；更正／撤回／partial必填；最多500字 |
| exampleOnly | optional true；只能離線preview，production gate必拒絕 |

完整正式成果需final/complete/valid、value非null、日界合法且已結束；尚未結束的preliminary可診斷保存但不算正式final。withdrawn必value=null，coverage不能complete，reason必填。未知/invalid沒有可信值就null；partial有可信部分量可以保留字串，但不冒充完整。品質狀態不得用缺字段預設為valid。

JSON schema只驗結構；跨欄位日界、authority、生效版本、未來final、calendar、mode與transport仍由共用semantic gate驗。未知欄位與重複key拒絕。period終點／offset正規化後的身份一致，不以字串格式製造另一筆。

## 5. Daily 的主鍵、更正與投影

主鍵固定(site,engineeringId,interval-energy,startInstant,endInstant)。相同key同dataRevision同義內容去重；忽略publishedAt、JSON key順序和messageId，不忽略value/status/coverage/quality/definition/calendar/reason。正規化decimal不先經float；不同版保留revision紀錄。

高版完整替換，低版不回退，同版異義衝突。上游每次修正附reason；v3先到可直接成為當前完整快照並記缺v2。withdrawn撤回後完整度下降；恢復用更高版，不刪舊紀錄。publishedAt較新不代表dataRevision較新。上游換機後版本不重新從1起算；新publisher的歷史更正權限須批准，但不變更業務key。

保存revision/current pointer/唯一鍵/投影invalidation同一DB交易。日、月、年、比例及展示都在fingerprint一致時才標current；重算pending期間不得無標示回舊總計。較新partial會讓舊final失去有效地位，UI明確提醒結果降級。

## 6. Power／counter 的最小差異

共同身份改mode=power-gauge或cumulative-energy；measurementKind分別power-gauge或cumulative-energy，unit分別kW或kWh；value精確字串、observedAt真工程checkpoint、sampleId、definitionRevision、quality與publishedAt必備。counter另有counterEpoch。這兩型不帶daily的periodStatus/dataRevision當報表，也不能混收daily topic。

沒有observedAt不能拿legacy ts/readAt/publishedAt補；有power但沒energy仍可先展示power。counter reset或工程口徑改變不跨版差分；重啟和中文改名不改epoch。`1000→1120=120`僅在連續性與邊界證據滿足時成立；`每日100、120=220`則是另一條計算分支。

## 7. 到件、保留與補收

排程包括site calendar、對應日的day offset、due local time、grace。模板全null；未提供就是unknown，不預設每天／午夜／90秒。完整昨日報表不會因今天90秒沒包被標裝置故障。publisher liveness、receiver status與report delivery各自顯示。

Latest retained只能補最後一期；上游重送原報表或授權管理匯入才能補其他日期。預設31日/248筆/4MiB一批、64KiB單包、93日正常補收窗口；這些是待測容量設計值。超過一般window另核准，不改每批界線；不因改查詢範圍而擴權。匯入依每筆回accepted/duplicate/conflict/rejected，不用HTTP200代表全部完成。不開新的MQTT控制topic、不自動操作上游。

current report identity與dataRevision防重保護跟成果history保留；不可只用24小時cache。移除舊history若無拒絕watermark不得自動重收為新報表。原始catalog/offline不是publisher backfill，永不升格為正式歷史。未提供補收機制時列出真實缺日與可匯出missing list，不宣稱完整。

## 8. 交到現有畫面

power維持原metric；日／月／年period-aware成果經新增typed provider→共用projection/readiness→display editor設定，不寫死於頁面。SiteEnergyProfileV2使用工程sourceRef，不偽造meterId，不讓v1 physical consumer猜新格式。

固定八列與側欄period/version；缺件不消失、不補0。合計只加當期有效的一層來源，未確認全廠coverage稱工程合計；7/8顯示partial與缺件。source config修改和報表更正是兩個不同動作，資料修正不能偷改dirty表單。

依據：固定main的seed.ts、meterReading.ts、periodConsumption.ts、siteEnergyProfile.ts與原六份artifacts；見REVIEW-ENGINEERING。MQTT retain/QoS邊界依OASIS MQTT 3.1.1 §3.3.1、§4.3（2026-09-16查核）。
