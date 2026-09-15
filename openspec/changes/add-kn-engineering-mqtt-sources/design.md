# Design: 工程別為邊界，資料模式決定計算

## Context

基準 main `818fa0da0d24d26ce9f847a5fdf6a9871c57bc0f`，重審 `8beacbd4ce50c393079308b17a2008835e7f8f24`。既有八工程／topic 在 seed.ts 與 factory-circuit-multi-site-split；實體來源與期間限制在 meterReading.ts、siteEnergyProfile.ts、periodConsumption.ts。所有定位以名稱和 fixed commit 記於共用 REVIEW-ENGINEERING，不把行號當唯一實作指示。

## Goals / Non-Goals

In scope：工程成果登錄、訊息合約、永久保存與更正、模式分流、八工程 UX、種類安全的會計／展示整合與可回退遷移。Out of scope：上游設備重設、現場 publish、替換 Solar adapter、改實體錶 E1 演算法、FHD 幾何及已完成資料驗收宣告。

## Decisions

### G1. 主體與唯一正式來源

使用 `site=kn` 與既有 `stamping/body/painting/assembly/utility/office/heavy_vehicle/ed_coating`；中文名稱可改，ID 不變。engineeringId 是工程分類，不是 meterId，也不是以 topic 文字授予的權限。已確認主體不代表真實 payload 已確認。

工程來源登錄的不可變 sourceRef 配 mutable configurationRevision；欄位包括 engineeringId、purpose(power/energy)、mode(unconfigured/power-gauge/daily-report/cumulative-energy)、exactTopic、批准 publisherId 與 effective window、definitionRevision、定義摘要／涵蓋範圍、unit、scaleDecimal、qualityPolicy、calendarRevision、expectedDelivery、replay policy、enabled/reviewStatus。不存憑空物理錶／Item／CT/PT。上游摘要能說明可信工程成果及範圍即可；不要求完整設備名冊才能接收。CT/PT 只在 publisher 實際交接原始未換算值時另審，不是工程報表必填。

按 (site,engineeringId,purpose,effective period) 最多一個正式 authority。energy 的 daily/cumulative 二選一；power 可獨立存在，不能自動積分為 energy。raw 與工程報表同時可見時，只能擇一層作相同會計覆蓋的正式輸入。unknown publisher 只能診斷；既有受信任 LAN 模式仍可由管理者批准來源，但 publisherId 字串不是密碼或身份證明。

### G2. 發布與訂閱

見 [KN-ENGINEERING-CONTRACT](../../../docs/plans/data-hub-reception-ux/KN-ENGINEERING-CONTRACT.md)。保留既有 power topic 的 kW 語意；新增 energy/daily 與 energy/cumulative 是提案。exact topics 從已批准來源產生，不能以 source row 名字自動猜。掃描範圍與正式訂閱分開；discovery 可受控掃描八個批准工程，不用 #、不把 unknown ID 自動上線。

Player 的 production desired set = managed Solar ∪ 既有 generic/physical ∪ enabled engineering exact topics。owner/refcount 決定解除訂閱；停某工程只退無其他 owner 的 exact topic。capture 結束只關獨立 client。舊世代 SUBACK 不更新新連線，publisher/WebUI ACK 不代表 Player 收到。

### G3. 三種資料模式

power-gauge：真正觀測時間 observedAt，kW；更新 live 需時間較新；等時同內容為重送，等時異值衝突，晚到不倒退。工程加總功率可為上游正式來源，不要求證明是一顆表。

daily-report：上游已算好日用電，unit=kWh，period=[start,end)，依已審核日曆兩個相鄰午夜。用已批准工程成果直接保存，不再求兩個 counter baseline。100、120 兩日合計220。零有效，缺件不是0；完整度是報表證據，不偽裝設備 Good。

cumulative-energy：工程連續累積計數，kWh、observedAt、counterEpoch、definitionRevision。1000→1120 的同口徑差120。工程納入設備增減、重置、來源替換或倍率改變需新定義／epoch；不跨未知連續性差分。名稱、publisher程序重啟不是新 epoch。必須有可信上游 checkpoint 時間；缺 observedAt 不從 ts/readAt/publishedAt 猜。工程 counter 以工程種類保存後重用既有 decimal/boundary 基本函式，不能假造 meter row。

本 change 先完整定義三種可選模式，不替使用者宣告目前是哪種。unconfigured 可以保存草稿、不可啟用。單個工程可先啟用一種已核對模式；不等待全部工程到件，也不要求上游同時發布三套。

### G4. 預覽、啟用與 runtime 同一套守衛

新工程 handler 在登錄 exact topic 的 generic fallback 之前消費訊息。嚴格 JSON（重複key拒絕）、UTF-8、大小／深度、allowlist、mode、publisher、site、engineeringId、定義、單位、decimal、時間、報表狀態全部驗證。不符合時是 handled rejection，禁止回落 $.value 或自動 ts 偵測。工程計算來源的 observedAt 是該計算的真 checkpoint，不要求設備事件時間；daily 用 period 邊界，不捏造 sourceTimestamp。

POST /api/data-hub/engineering-sources/preview、POST /api/data-hub/engineering-sources/apply 為新增提案，沿用既有管理授權與 token 機制。canonicalDraft 綁來源設定版本、publisher authority、mode、definition/calendar、排程、replay policy、sample revision；改一項需要重 preview。apply 使用 expectedRevision＋固定 idempotencyKey，atomic uniqueness check；saved、SUBACK、received、usable 分開。物理 M2 原路徑不搬欄位；新的型別分支共用機制而非只複製同名 token 字串。

GET /api/data-hub/engineering-sources 讀草稿／批准狀態；PATCH/disable 只更改receiver配置且由E的guard協調。GET /api/data-hub/engineering-results?scope=kn&engineeringId=…&fromDate=…&toDate=…&cursor=… 為新增、有界管理讀取，不接受任意timezone覆寫。Source endpoints 不受未來 results 來源型別可用性保證影響；未支援server則 UI 明示不能啟用，不走 legacy fallback。

### G5. 報表身分與更正

業務鍵 = (site, engineeringId, measurementKind=interval-energy, periodStartInstant, periodEndInstant)。不把 publisherId、dataRevision、receivedAt、definitionRevision 加入成可再加總的身份。授權與 definition/window 一致性先驗，再對相同業務鍵判版本。digest 包含值、單位、期別、definition、品質／完整度、狀態、更正原因；不包含 JSON順序、publishedAt、messageId、transport 和接收時間；decimal 與 offset 正規化後比對。

同版同義內容為 duplicate；同版不同義內容衝突不覆蓋。較舊版本只記有界診斷。較新版完整替換（不是差量），保留歷史與reason，CAS更新current pointer；可跳版但記缺版號，不能因缺v2就拒絕合法完整v3。撤回用更高版 status=withdrawn/value=null/reason，不刪舊值；後續恢復也需更高版。較新partial/preliminary使有效成果降為不完整，不暗留舊final冒充有效；狀態惡化須audit。

持久交易同時插入不可變revision、唯一business key/version、current pointer與投影invalidations/outbox。commit後回應遺失可安全重送；commit前crash可重試，不能先留下「已看過sample」而未保存成果。兩worker同鍵互斥/CAS，sender切換不重設版本。unapproved definition不得排擠已批准結果。

### G6. 覆蓋與統計

日final+complete+valid且期別合法：該工程該日可用，毋須兩個累積值。partial/preliminary/withdrawn/unknown 不進完整正式總計，可列部分已知量。當月／年只加目標範圍內每個日鍵的有效版本；不加「昨日」、「累積總表」或月報再算一次。日報v1不接非整日任意interval；此限制不改既有E1 interval行為。

工程集合按版本化 accounting profile 的 effective periods 計算預期項。八工程預設皆預期但來源初始未配置；有意排除需保存生效日、理由和新profile版，不能因缺值自動少算預期數。期間變更／定義變更不得切在日中；v1日報模式要求午夜生效或將跨界報表隔離，不按時數比例拆。7/8顯示部分與missing IDs；全廠覆蓋未審核，只稱工程別合計。expected schedule未提供時dueStatus=unknown，不偷偷套30/90秒。

### G7. 接上既有系統，而非另造假 meter

新增 EngineeringSourceDefinition/EngineeringPeriodReport，不擴大 MeterSourceDefinition 讓 engineeringId 偽裝 meterId。新增 engineering_source_definitions、engineering_report_revisions、engineering_report_heads（名稱提案）及工程counter觀測的種類安全儲存；保留原physical資料、來源與索引。

新增 SiteEnergyProfileV2 可判別引用：{kind:'physical-meter',channelId,…} 或 {kind:'engineering',sourceRef,engineeringId,mode,…}。v1 physical profile 原樣可讀，轉v2須明確審查；初版同一profile會計期間只選 physical 或 engineering 一種集合，不混父子層。同site不允許兩個版本各啟用同一canonical目的。工程分類與報表definition是來源語意；總計／部門分母／全廠coverage僅由profile擁有，不接受payload自行指定。

共用 period-result provider 依來源種類 dispatch：physical 仍呼叫原 E1/E2；工程daily直接取有效報表，工程counter走工程連續性分支。共同API/投影/readiness/展示讀取明示 resultKind、profileRevision、inputFingerprint、period、quality、missingEngineeringIds、definition/data revisions。修正版在同交易建立invalidation後，舊投影必須標stale/not-current；重算用一致資料快照＋再次比fingerprint，輸入又改即重試，不先發布舊總計為current。

不要把新的期間kWh綁 factoryCircuit.*Power；原power語意metric只接power。日/月成果由既有 display editor 的新period-aware選項提供，不改播放頁硬碼，也不把payload日期當全站查看日期。v1 consumer讀不懂v2時只回可識別unsupported，禁止silent downgrade。所有這些為必要新實作，不宣稱目前已有工程period provider。

### G8. 收件排程與補收

report排程用site calendar＋due local time＋day offset＋grace；由publisher交接後管理者批准，模板都是null。獨立顯示pending/not-due/on-time/late/missing/unknown；歷史final超過90秒不變成設備斷線。heartbeat、transport、report readiness三者分離。

QoS1不能代替業務鍵；latest retained可送最後一期daily但保留原period，且不能證明補齊多日。自動補收以批准上游重送原報表到原exact topics，或管理者匯入來自批准publisher的JSON報表包，走同一gate和交易，origin=publisher-replay/authorized-import，不拿catalog/offline evidence回灌。來源啟用前報表不得因capture就被接受；需要明確批准的backfill範圍與該period的definition/authority。

初始提案限制：單訊息64KiB/JSON深度8/最多64欄位；每次補收最多31日×8工程=248筆、4MiB總包；一般補收窗口93日、更舊資料需另一次明確管理批准，任務上限依31日分批；publisher建議可取回至少93日，現場能力不足就揭露保留期與缺日。限制是設計值，需以248筆最大字串／深度fixture和故障重試驗證，不是實測容量。持久current key/version與更正audit跟報表保留政策一起保存，不在24小時mutation cache到期後失去報表去重；任何清除必須保留不可再接受的watermark或tombstone。

初版不新增MQTT command-control/backfill request topics，不暗連publisher HTTP；缺上游補送能力時列出明確缺件與可下載補收清單，不自動反覆寬範圍掃描。匯入每筆是原子、批次可部分成功；返回逐筆結果，不把248筆一個200當全部accepted。

### G9. 介面與移交

固定八工程列：名稱、來源模式、exact topic、訂閱、所屬日期、完整度／更正版、到件狀態、下一步。engineering view載入失敗計數unknown而非0；沒訊息工程也存在。不要求180秒capture看到一天一包才准設定，允許範例preview或登錄草稿；例子不能作正式資料。接受報表後三階段完成頁明示usable period，不顯示「總錶已接好」。

側欄維持A的焦點/捲動/面板內save，改標題觀音／工程，分概覽、訂閱與欄位、期間與版本、使用情況。config dirty跟報表dataRevision分開，接到更正版不覆寫草稿或跳焦點。保存期別／重送範圍留allowlisted URL或短期state，raw payload不進URL。更正紀錄可讀，正式值不能直接在側欄改字；管理更正仍走versioned report gate與授權。

啟用／遷移順序：新增種類／讀取能力→隔離sample/period交易→工程registry與預覽→明確選模式／authority／排程→影子對照→單一writer切換→工程profile v2→display binding。全程不修改CL raw、Solar或八工程幾何。Rollback停新admission保留history，不強制啟用physical fallback。模式在日界切換，涉及counter的一側需自己的baseline；沒有證據時切換日partial。

## File Changes

Proposed additions: packages/shared/src/engineeringSources.ts、engineeringPeriodResults.ts；apps/server/src/services/engineeringSourceService.ts、engineeringReportService.ts、engineeringPeriodProvider.ts；管理routes與additive migrations依當時序號命名。整合 MqttClientService、guidedMqttMappingService、siteEnergyProfile/period result dispatch、consumptionProjectionService、departmentSharesService、DataHub與display editor的來源選擇。先定位當時readers/callers並測v1相容，不能以本段清單聲稱已完成全專案盤點。

## Validation / Open Decisions

各requirement與CASE驗收見specs與CHECKS；所有產品tasks尚未執行。未定且必須在啟用前核對：每工程mode、payload實樣、publisher權責、definition／涵蓋範圍、delivery deadline/grace、historical replay能力。這些保留為具名未配置狀態，不阻擋本次草稿交付。不需要先知道每顆表／DDE Item。

正式Spectra CLI在本環境不存在（exit127）；其工作流未完成。手工OpenSpec草稿的靜態／契約fixture檢查另列，不冒充官方validate或產品E1/MQTT測試。
