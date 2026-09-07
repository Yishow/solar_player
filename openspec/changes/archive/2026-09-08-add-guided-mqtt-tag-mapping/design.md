# Design｜先選收到的資料，再批次建立電錶tag

## Scope

**In scope**：三階段來源任務、欄位樹與tag picker、穩定selector、批次套用、同parser預覽/ingestion、來源profile接續、版本化套用與相容legacy寫入。
**Out of scope**：依名字自動判定電路拓樸、不經確認全自動命名與分母、任意JS/完整JSONPath、vendor binary decoder、正式MQTT測試publish、自動電價計算與完整視覺設計器。

## User Flow

入口：資料中心→觀音→從收到的資料加入電錶；U6總錶/部門選擇器、既有迴路來源與展示卡片共用這一個面板。
1. 找資料：沿用連線/命名範圍，先看已觀察，再按「尋找新資料」。列已接收未配置、已配置正常、等待資料、需要確認，選取一筆或多筆。
2. 選數字和用途：結構自動展開。先選value/energy等欄位；tag/value輪流送時選tag列。確認中文名、量測種類、單位、倍率及目標tag。多顆可同批套用確認過的格式，只有不相容/歧義列逐筆修。总錶/部門屬性屬E6 draft，不由名字或大數字自動猜。
3. 看結果並套用：顯示來源tag→讀值→正確單位/累積語意→目的電錶/部門與影響。preview回傳opaque previewToken並綁定當下canonical draft與review evidence；profile任務中最後集中確認；已有來源可直接返回原欄位。不要求在editor再填topic/path。

所有按鈕/route為要實作的設計，不是main現有UI。首次connection/範圍未知時需inline必要設定，不承諾無條件三下滑鼠。日常再新增相同格式電錶，不重填連線、不抄topic、不重跑其他部門。

## Selector Contract

版本化的BindingSelector（ proposed shared type ）：
- exactTopic：一個已觀察且經允許的Topic，不能把discovery wildcard直接当meter identity。
- messageWhere：allowlisted typed equality predicates，適用同Topic輪流tag/value，如tag等於MAIN，必要時加deviceId防撞。
- recordsPath：optional property-token path指向JSON array。
- recordWhere：array row穩定tag/device key等值；只允許一個符合row。
- valuePath、timestampPath、unitPath：在packet或selected record內的property-token paths。paths不是eval、也不是任意JSONPath程式碼。
- selectorVersion、expectedSchema、measurementKind、energyFlowRole、unit、scaling policy、timestampPolicy（default `source-required`；只有經sourceRevision/audit明確核准才可為`allow-receive-time-estimate`）、optional sourceTimestampTimeZone（只在解析沒有offset的source timestamp時需要；scalar無timestamp或已有offset／`Z`的時間保留明確null/absent狀態）、sourceRevision。名字改變不更改meterRef；物理更換走E1 epoch。

scalar、nested object、多tag packets、tag array共用一個server engine。為字面key如meter.total使用property token而非字串split-dot。無stable row key不能默默用array[0]；提供「改用具識別碼的資料／支援的結構」inline提示。缺tag/重複tag/type不合/field消失產生no-match或invalid，不写0或改綁其他數值。

解析counter要保留decimal lexeme/decimal string到E1，不能先用JSON.parse＋Number毀掉大register差值精度；具體lossless decoder依repo依賴審核決定，不透過瀏覽器浮點數作權威計算。現有PayloadParser的scalar/path兼容層保留，新的selector-aware ingestion走明確version分支。parser能力可在UI查詢，前端不提供server尚未支援的path。

## Suggestions and Templates

映射建議只用已審核模板、payload宣告資料、觀察到的structure。依據與待確認列可見；名稱匹配是建議不是證明。累積/區間/功率、kWh/Wh倍率、是否上游已乘CT/PT需要確認。
模板可保存結構/單位/語意，不含密碼、實體meter IDs或跨廠所有權；下一批來源套用時先做diff，重複的source fingerprint回報「已存在」；來源更換經版本review，不自動跳到新錶。

## Proposed API and Apply Semantics

- GET /api/settings/mqtt/mapping-capabilities：支援shapes/selector types/limits。
- POST /api/settings/mqtt/mapping-drafts/preview：接受selectors所有欄位（含selectorVersion/expectedSchema）、target/site/physical identities、measurementKind/energyFlowRole/unit/scaling、timestampPolicy及只在需要時的sourceTimestampTimeZone、selected item set、optional E6 mutation，以及source/profile/candidate/sample revisions；回逐列match/no-match、normalized value、period readiness、warnings、server-issued opaque `previewToken`與`canonicalDraft`（server正規化後、供UI review展示並原樣帶回apply）。canonical draft保留timestampPolicy與sourceTimestampTimeZone的明確null/absent狀態。server保存token對應的canonical draft、review evidence snapshot與expiry；不寫domain metrics、live values、baseline、profile或page。
- POST /api/settings/mqtt/mapping-batches/apply：request必須包含`previewToken`、與preview完全相同的canonical draft及`idempotencyKey`。server重新canonicalize並比較token綁定內容；selector、target、site/physical identity、measurement semantics、selected rows、optional E6 mutation或任一source/profile/candidate/sample revision改變均回`409 PREVIEW_MISMATCH`或`409 PREVIEW_STALE`且零寫入。token不可由任意client hash取代。
- API先做授權，再以`previewToken`與canonical draft計算server-side canonical request hash。先查已提交的idempotency record：同key同hash即使token已過期或revision已推進也回傳原結果；同key不同hash回`409 IDEMPOTENCY_CONFLICT`。首次apply在transaction提交前重新檢查token與所有revisions，避免TOCTOU；失敗不寫任何source、mapping、profile或history。
- transaction只寫本批次涉及項目。broker訂閱不是SQLite原子操作，故用pending-reconcile狀態＋持久化desired-config revision重試，訂閱被拒要顯示configured-but-not-receiving，不能回live成功。最大200項一批為初始有界設計；大批次分批前說明範圍，不默默截斷。
- U6嵌入模式可維持來源draft至profile final apply，optional E6 mutation與source writes在同一個reviewed transaction；獨立模式只建立source並綁相關profile baseline或明確unconfigured，不偷偷改siteTotal/shareBasis，也不在E1 source保存總錶／部門accounting ownership。要在嵌入中提前存source時必須明確列出此副作用。
- 正式ingestion只收activation後經production path驗證的packet；不能把capture preview的資料重送作為新電量。若業務需历史import另走E3有界程序。

## Implementation Contract

**Behavior**：operator在preview看到的每一列、selector、target、measurement semantics、revision與optional E6 mutation必須是apply實際提交的同一份canonical draft。任何變更都要求重新preview；apply只接受尚未失效且與token完全相符的draft。

**Interface / data shape**：preview response包含opaque `previewToken`、server正規化後的`canonicalDraft`、逐列結果、review evidence snapshot reference與expiry；UI review必須展示這份canonicalDraft，apply原樣帶回。server保存token綁定的canonical draft，至少包含selectors全欄位（version、schema、topic、predicates、paths）、selected item set、target/site/physical identities、`measurementKind`、`energyFlowRole`、`unit`、`scaling`、`timestampPolicy`（預設`source-required`，allow只存經sourceRevision/audit核准的值）、optional `sourceTimestampTimeZone`（只在offset-free source timestamp需要；無timestamp或已有offset/`Z`時保留明確null/absent）、optional E6 mutation、source/profile/candidate/sample revisions。apply request包含`previewToken`、preview回傳且UI確認過的同一draft與`idempotencyKey`；canonical hash由server計算，不能使用client自帶hash代替。

**Failure modes**：token過期、review evidence或任一revision改變、draft欄位改變、選定列改變、optional E6 mutation改變或transaction提交前重查失敗，均回409且零寫入。授權後若idempotency key已提交且hash相同，先回原結果，即使token後續過期或revision已前進；hash不同回409 conflict。首次apply失敗不得留下半套source、mapping、profile或history。

**Acceptance criteria**：測試涵蓋`importEnergy`改成`activePower`、target改變、measurement semantics改變、selected item set改變、source/profile/candidate/sample revisions改變、optional E6 mutation改變、token expiry、same key changed payload及lost-response exact retry；每個變更均驗證409與SQLite zero-write snapshot，exact retry驗證回傳同一已提交結果且不重複建立source。另驗證首次apply在commit前的revision recheck可阻擋TOCTOU。

**Scope boundary**：本change只定義M2 source mapping的canonical preview/apply、idempotency與E6嵌入接續。E1保存物理來源與量測語意；總錶、部門歸屬與分母只由E6 profile mutation表達。正式MQTT ingestion與E2/E6 accounting演算法由相依change實作。

## Legacy Safety and Migration

現有topic_mappings全表PUT可能不知道selector/sourceRevision欄位，新增能力必須提供preservation-aware adapter或拒絕對selector-aware項目的舊格式寫入。只修改CL其他mapping不能把KN新selector擦掉。保存既有IDs、offset/decimal/multiplier、source ownership；新的binding fingerprints不改舊欄位的唯一性語意。試用feature flag期間舊source透過同identity compatibility layer，不同時ingest兩次。

## Migration and Rollout

E1精度/identity、E6 profile與M1候選契約先就緒；M2先隔離broker＋shadow extraction對帳，既有mapping不自動重寫。檢查同topic多tag不串值與legacy存檔不清selector，才開批次apply。回退UI flag但保留能讀既有selector版本的runtime；若要回退runtime需先將受影響來源停用/恢復已驗證舊revision，不能讓舊engine把多tag都吃成同一錶。原始讀值及歷史epoch不刪。

## Verification

正例/反例共用同fixture引擎，包含tag交錯、array reorder、duplicate ID、literal dotted keys、0值、decimal精度、schema drift、expired evidence、ACL、batch idempotency與concurrent version conflict。UI無手冊三階段與返回原profile、最少3位未受教學操作者實測。來源觀察/擷取成功不等於月初基準已足；Q1貫通到月圖及比例。所有產品驗收尚未執行。
