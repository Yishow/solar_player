# Design｜先選收到的資料，再批次建立電錶tag

## Scope

**In scope**：三階段來源任務、欄位樹與tag picker、穩定selector、批次套用、同parser預覽/ingestion、來源profile接續、版本化套用與相容legacy寫入。
**Out of scope**：依名字自動判定電路拓樸、不經確認全自動命名與分母、任意JS/完整JSONPath、vendor binary decoder、正式MQTT測試publish、自動電價計算與完整視覺設計器。

## User Flow

入口：資料中心→觀音→從收到的資料加入電錶；U6總錶/部門選擇器、既有迴路來源與展示卡片共用這一個面板。
1. 找資料：沿用連線/命名範圍，先看已觀察，再按「尋找新資料」。列已接收未配置、已配置正常、等待資料、需要確認，選取一筆或多筆。
2. 選數字和用途：結構自動展開。先選value/energy等欄位；tag/value輪流送時選tag列。確認中文名、量測種類、單位、倍率及目標tag。多顆可同批套用確認過的格式，只有不相容/歧義列逐筆修。总錶/部門屬性屬E6 draft，不由名字或大數字自動猜。
3. 看結果並套用：顯示來源tag→讀值→正確單位/累積語意→目的電錶/部門與影響。profile任務中最後集中確認；已有來源可直接返回原欄位。不要求在editor再填topic/path。

所有按鈕/route為要實作的設計，不是main現有UI。首次connection/範圍未知時需inline必要設定，不承諾無條件三下滑鼠。日常再新增相同格式電錶，不重填連線、不抄topic、不重跑其他部門。

## Selector Contract

版本化的BindingSelector（ proposed shared type ）：
- exactTopic：一個已觀察且經允許的Topic，不能把discovery wildcard直接当meter identity。
- messageWhere：allowlisted typed equality predicates，適用同Topic輪流tag/value，如tag等於MAIN，必要時加deviceId防撞。
- recordsPath：optional property-token path指向JSON array。
- recordWhere：array row穩定tag/device key等值；只允許一個符合row。
- valuePath、timestampPath、unitPath：在packet或selected record內的property-token paths。paths不是eval、也不是任意JSONPath程式碼。
- selectorVersion、expectedSchema、measurementKind/unit/scaling policy、sourceRevision。名字改變不更改meterRef；物理更換走E1 epoch。

scalar、nested object、多tag packets、tag array共用一個server engine。為字面key如meter.total使用property token而非字串split-dot。無stable row key不能默默用array[0]；提供「改用具識別碼的資料／支援的結構」inline提示。缺tag/重複tag/type不合/field消失產生no-match或invalid，不写0或改綁其他數值。

解析counter要保留decimal lexeme/decimal string到E1，不能先用JSON.parse＋Number毀掉大register差值精度；具體lossless decoder依repo依賴審核決定，不透過瀏覽器浮點數作權威計算。現有PayloadParser的scalar/path兼容層保留，新的selector-aware ingestion走明確version分支。parser能力可在UI查詢，前端不提供server尚未支援的path。

## Suggestions and Templates

映射建議只用已審核模板、payload宣告資料、觀察到的structure。依據與待確認列可見；名稱匹配是建議不是證明。累積/區間/功率、kWh/Wh倍率、是否上游已乘CT/PT需要確認。
模板可保存結構/單位/語意，不含密碼、實體meter IDs或跨廠所有權；下一批來源套用時先做diff，重複的source fingerprint回報「已存在」；來源更換經版本review，不自動跳到新錶。

## Proposed API and Apply Semantics

- GET /api/settings/mqtt/mapping-capabilities：支援shapes/selector types/limits。
- POST /api/settings/mqtt/mapping-drafts/preview：candidate/sampleRef revisions＋selectors＋target choices，回逐列match/no-match、normalized value、period readiness、warnings與preview token；不写metrics/baseline/profile/page。
- POST /api/settings/mqtt/mapping-batches/apply：preview revision、idempotency key、selected items、optional explicitly reviewed E6 profile mutation；transaction保存來源、對應、profile版本。最大200項一批為初始有界設計；大批次分批前說明範圍，不默默截斷。
- API先做授權/版本/identity檢查；transaction只寫本批次涉及項目。broker訂閱不是SQLite原子操作，故用pending-reconcile狀態＋持久化desired-config revision重試，訂閱被拒要顯示configured-but-not-receiving，不能回live成功。
- U6嵌入模式可維持來源draft至profile final apply，統一授權transaction；獨立模式只建立source，不偷偷改siteTotal/shareBasis。要在嵌入中提前存source時必須明確列出此副作用。
- 正式ingestion只收activation後經production path驗證的packet；不能把capture preview的資料重送作為新電量。若業務需历史import另走E3有界程序。

## Legacy Safety and Migration

現有topic_mappings全表PUT可能不知道selector/sourceRevision欄位，新增能力必須提供preservation-aware adapter或拒絕對selector-aware項目的舊格式寫入。只修改CL其他mapping不能把KN新selector擦掉。保存既有IDs、offset/decimal/multiplier、source ownership；新的binding fingerprints不改舊欄位的唯一性語意。試用feature flag期間舊source透過同identity compatibility layer，不同時ingest兩次。

## Migration and Rollout

E1精度/identity、E6 profile與M1候選契約先就緒；M2先隔離broker＋shadow extraction對帳，既有mapping不自動重寫。檢查同topic多tag不串值與legacy存檔不清selector，才開批次apply。回退UI flag但保留能讀既有selector版本的runtime；若要回退runtime需先將受影響來源停用/恢復已驗證舊revision，不能讓舊engine把多tag都吃成同一錶。原始讀值及歷史epoch不刪。

## Verification

正例/反例共用同fixture引擎，包含tag交錯、array reorder、duplicate ID、literal dotted keys、0值、decimal精度、schema drift、expired evidence、ACL、batch idempotency與concurrent version conflict。UI無手冊三階段與返回原profile、最少3位未受教學操作者實測。來源觀察/擷取成功不等於月初基準已足；Q1貫通到月圖及比例。所有產品驗收尚未執行。
