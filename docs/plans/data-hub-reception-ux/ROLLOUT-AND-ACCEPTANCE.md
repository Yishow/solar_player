# 依賴、交付順序與驗收

本稿只有規劃文件；下列所有產品測試與里程碑都尚未執行。A/B/C/D/E 是本規格包的閱讀索引，不是既有產品模組名稱。

## 1. 拆分與所有權

| 代號 | 主要責任 | 不得搶走的責任 |
|---|---|---|
| A | inspector 視覺、焦點、容器排版、面板操作位置 | 不自行實作第二套 source writer 或 URL parser |
| B | configured/received 兩視圖、候選呈現、路由與上下文 | 不發明第二套 capture／解析服務 |
| C | 正式／候選／測試狀態、共享 Broker、安全捷徑 | 不為 CL／KN 各建立假 Broker |
| D | 三階段選取、語意審查、預覽／套用、選定目標診斷 | 不修改既有能源算法、不把 capture 回灌 history |
| E | 單筆草稿、stable identity、版本、原子影響檢查、legacy writer 相容 | 不替代 M2 的 reviewed semantics/token 協議 |

A、B、E 的 delta 都涉及 `data-hub-task-workspace`，但修改的既有要求分別是 U1-R6、U1-R8、U1-R5；不得用整份 main spec 的舊副本互相覆蓋。C 修改 management-surface 的中央 Broker 要求；D 修改 M2-R1；原 A–E 範圍中 E 新增 capability `data-hub-source-edit-transactions`。其他新增 requirement 附在既有 capability，不冒充整份新能力。

## 2. 依賴圖與最小可交付階段

```text
A 焦點／排版基礎 ───────────────────────────┐
E writer＋draft service ─→ A 單筆儲存啟用 ──┤
E stable identity ───────→ B 永久選取連結 ───┤
B received candidates ──────────────────────┼→ D 三階段整合
C truthful connection test＋context ────────┘
```

E service 與 A UI 的整合不是互相阻塞的循環：E 先提供可獨立測試的資料與操作介面，A 再使用。B 的接收視圖可先以現有 candidate IDs 工作；永久來源連結待 E 的穩定引用。D 可直接重用既有 M2 寫入能力；不應把所有 mappings 強制轉成 generic PATCH。

| 階段 | 可交付內容 | 必須滿足的閘門 |
|---|---|---|
| 0 | A 的焦點修復、容器版型、面板內真實範圍回饋；C 的 GET/test 文案校正 | 不改寫入語意；過渡 save 若全量就明示 N 筆；未有真證據不變綠燈 |
| 1 | E stable references／revision／guarded writer＋C 狀態模型 | 盤點 legacy callers，禁止無版本 bypass；synthetic DB regression；不碰正式 Broker |
| 2 | A 完整短編輯＋B 接收工作台與路由 | panel 內單筆結果；多 profile、scope、retained、過期與 Back/Forward |
| 3 | D 三階段、batch review、可選的安全發送 | exact canonicalDraft＋token；same-key retry；零 capture 回灌；返回原任務 |
| 4 | 跨頁鍵盤／瀏覽器與隔離 Broker 驗證，文件對齊 | 實際輸出、最後版本 verify、產品審閱；不得把本次規格結構檢查當成此階段完成 |

每階段可再拆小 PR／change 的實作任務，不要求五個 change 一次併入。提交、合併、部署與發送正式資料需另有明確授權；本稿不執行。

## 3. 驗收矩陣

以下為後續必測案例。Pass 的證據應包含測試名稱、fixture／browser 版本、viewport、commit、結果；畫面截圖中不得有真密碼或原始敏感 payload。

| Case | 條件與操作 | 預期結果 | Owner |
|---|---|---|---|
| AC01 | 來源名稱連續輸入20字、IME組字中收到10次 live update | caret、composition、焦點不重置，不跳回關閉 | A |
| AC02 | 鍵盤打開／切分頁／存檔／關閉；隱藏進階欄存在 | Tab 不進背景或隱藏欄；close 返回觸發列一次 | A |
| AC03 | 原列刪除或篩掉後關閉 | 回相鄰列／列表標題等既定位置，不落 body | A＋B |
| AC04 | 1366×768、1440×900、1920×1080 | 主要 save/discard/error 可達，不被 footer 遮蔽 | A＋C |
| AC05 | 768／390／320 CSS px、200% zoom、長topic／多行中文 | 非例外內容不橫向溢出；長值可完整檢視與複製 | A＋B＋C |
| AC06 | dirty drawer → full workspace → drawer | 一份草稿、同一 sample revision、無暗中保存 | A＋D＋E |
| AC07 | 同一來源兩人讀 r4，先後儲存 | 首次 r5；第二次409，原草稿保留、零覆寫 | E |
| AC08 | KN編輯中CL被他人修改，再存KN | CL最新配置 byte-equivalent、不被舊快照覆蓋 | E |
| AC09 | 版本化writer啟用，舊client送無版本全量PUT | 明確衝突／升級處理，不繞過新版保證 | E |
| AC10 | 回應遺失但DB已commit，重送相同key＋內容 | 回原結果，不多建來源、不reset baseline | E＋D |
| AC11 | 同一 idempotency key 搭不同patch | 409 conflict，沒有第二個語意不同的寫入 | E |
| AC12 | delete preflight無引用，commit前新增引用 | server原子重查阻擋，不誤刪 | E |
| AC13 | impact查詢失敗／權限撤回／託管來源修改 | unknown不可當無引用；403/conflict不假成功 | E＋A |
| AC14 | 新的local draft未保存就捨棄 | 不查persisted impact、不送server delete | E |
| AC15 | server正規化名稱／單位後save成功 | 新baseline採canonical response，dirty清除 | E |
| AC16 | zero mappings但有授權觀測 | 接收視圖能選候選，不只顯示空白技術表單 | B |
| AC17 | 多profile、多filter、部分拒絕 | 明確選擇，列出覆蓋與拒絕，不稱全站掃描完成 | B |
| AC18 | granted但無流量、retained舊包、capture過期 | 三種不同狀態，保留草稿、不捏造fresh值 | B＋D |
| AC19 | 同topic交替MAIN/STAMP，array換順序 | 穩定tag選取，不抓最後一包冒充全部來源 | B＋D |
| AC20 | CL/KN快速切換，前次response較晚到 | 舊site資料不進新site、selection不越權 | B |
| AC21 | KN→Connections→Sources；開來源後Back/Forward；直接bookmark關閉 | scope/query/選取按合約保留；不錯誤back出應用 | B＋C |
| AC22 | 正式A連線正常，草稿B測試失敗，再改C | 正式仍A；B結果不顯示C已測，結果有版本／時間 | C |
| AC23 | GET check、POST test、PUT save 分別操作 | 名稱、效果吻合；test無save/publish/runtime斷線 | C |
| AC24 | 密碼保留／取代／清除；effective由env覆寫 | 遮罩不外洩；不將保存回應當有效連線已改 | C |
| AC25 | preview後改selector／unit／target／selected set | 舊token不能套用；409零domain writes，重preview | D |
| AC26 | 離線／retained／只有一筆累積樣本預覽與套用 | 不回灌history；不冒稱日月baseline成立 | D |
| AC27 | config已保存但SUBACK拒絕／runtime失敗 | saved與activation failed分開，重試不重建source | D＋E |
| AC28 | 對非consumptionEnergy來源發測試值，target/value變更或token逾期 | 確認頁以該已保存來源為準，變更後重確認 | D |
| AC29 | 真發送的HTTP結果未知 | 不自動重發，不武斷說未發送 | D |
| AC30 | sourceRef遷移／舊caller同步／UI回退 | 既有selector、offset、precision、history、profiles保持，不回復blind replace | E |
| AC31 | managed adapter資源健康而generic lastValue空 | 顯示託管資源摘要，不誤顯單筆缺值 | A＋B |
| AC32 | 同一source dirty時close、route、scope三種離開入口 | 每次僅一個guard；取消後focus回原欄位 | A＋E |

## 4. 測試分層與執行入口

單元：URL parser/resolver、status presenter、draft state machine、revision compare、canonical request、選取保留。元件：drawer、SourceCards、Connections 狀態與正常／錯誤／空畫面。整合：DB transaction、legacy writer、preview/apply、source-impact原子檢查。真瀏覽器：焦點、IME、scroll、Back/Forward、窄畫面。隔離 Broker：test client 不干擾正式模擬client、SUBACK拒絕、retained與capture stop。[來源：S16與各能力規格，見 SOURCES.md]

按 repo 的實際慣例先跑受影響測試，例如 `pnpm --filter @solar-display/web test`、`pnpm --filter @solar-display/server test`；確定檔名與 runner 參數後可縮到 focused case。產品碼實作完成後跑最終 `pnpm verify`，另列 browser/Broker 結果；這些命令不是本次已跑的證據。

視覺可用性應由真實任務演練確認：找出問題來源、改名稱、處理同筆衝突、接入一組tag、判讀保留舊資料。記錄完成／放棄、錯誤操作與困惑點；沒有基準量測前不承諾「效率提升X%」。

## 5. 規格合併與回退

套用前重新讀 main 與 active/parked changes，確認自此基準後的漂移。多個delta只同步自己擁有的requirement，逐一validate；archive後再檢查其餘change against最新main。不要把這個包當新repo根目錄，也不要覆蓋現行openspec/config.yaml。

回退關閉新介面與新增入口，但保留已遷移stable id／revision、既有欄位、history與guard。停止capture只關臨時subscriber，不unsubscribe正式來源、不清retained訊息。任何功能flag必須在實作時有真實reader與測試，不能只寫在文件上。

## 6. F：選用實體發布契約與觀音交接關卡（工程別範圍已修訂）

原 A–E 相依圖只有 Player UI/交易範圍；F physical v1 是選用該實體協議的前置，G 是 KN 工程結果的前置。A 的焦點／版型不等待現場，KN 工程也不等待 CL 實體點位盤點。

A 純 UI/C 接收端標示可先做；E receiver writer 與 F protocol／publisher 工作可並行。B 的 Solar managed reuse 不依賴 OPC v1；B/D 明確選用 physical v1 的候選與 apply 必須等待 F 的 gate 與批准 registry；工程模式改依 G。F 基礎不依賴 B/D UI，可用隔離contract tests獨立驗證，因此沒有循環依賴。每個 KN 工程的成果契約未批准時，只擋該工程啟用，不要求實體名冊。

F ownership：選用 physical bridge 的 topic/Client ID、decimal/time/quality、gate、legacy cutover及KNP工程交接關卡；不能接管 G 的工程期間成果、E 的generic writer、Solar adapter或 E1/E2/E6 算法。原 AC01–AC32 保留，以下新增案例目前均**尚未執行產品驗收**。

| Case | 條件 | 預期 | Owner |
|---|---|---|---|
| PM01 | CL+KN publisher 同 broker | 部署唯一 Client ID；兩條 session 不互踢；site-scoped topic 不撞名 | F |
| PM02 | 只改 Player broker A→B | 兩個上游 config、Broker daemon、WebUI target 不改；B連線不表示有來源資料 | C/F |
| PM03 | Solar canonical 出現在 received | 重用 managed，不新建 generic factoryGeneration/solarZone writer | A/B/D |
| PM04 | 未知 solar custom topic | 允許在非 owned identity 下明確審核；不全 prefix 封鎖 | B/D |
| PM05 | factory/kn/ profile 對 opc/v1/kn | 顯示 coverage mismatch；批准新範圍前不發 opc/# 或 # | B/F |
| PM06 | production mixed filters＋capture stop | 只關 capture client；managed/generic 都保留；WebUI subscriber 不受影響 | B/E |
| PM07 | Player reconnect | 新 generation 恢復 Solar managed + enabled raw；不借舊 SUBACK | C/E |
| PM08 | collector reconnect／WebUI subscription-sent | daemon恢復配置廠區 command topics；WebUI sent 不冒充 Player ACK | B/C |
| PM09 | DDE read 成功但無 device time/quality | source time=null、source quality=unknown；預設 source-required 不准假時戳入庫 | D/F |
| PM10 | 明確審核估計＋retain/dup 變化 | 只按既有 E1 transport predicate；retained/dup/缺flags 不能自行降級 | D/F |
| PM11 | 大數 .000→.125 | reader到wire到E1保留 decimal lexeme，精確差0.125，不round後補字串 | F |
| PM12 | 同sample重送／same value新sample | 前者持久去重；後者不因value相同被誤丟；same-id不同body隔離 | F |
| PM13 | 部分Item失敗／空公式／virtual缺member | raw有效點獨立；失效點不0；virtual整組invalid，空公式不0/true | F |
| PM14 | schema/site/tag/producer不符但value可解析 | 共同gate阻擋generic fallback；preview/runtime相同結果 | D/F |
| PM15 | 舊retained或snapshot被新訂閱接到 | diagnostic only；不生新baseline，不影響合法Solar retained契約 | B/D/F |
| PM16 | virtual組員改變／分錶reset | publisher revision可見；aggregate不作物理counter差分 | A/D/F |
| PM17 | legacy與v1雙發及切換 | 只有一條accepted writer；guarded cutover及連續性審核；回退不刪history | E/F |
| PM18 | publish timeout或source停更但heartbeat正常 | unknown outcome／measurement stale 分開；不顯示全部健康 | A/C/F |
| PM19 | 修改 publisher broker 但尚無熱切換 | 顯示 saved/restart-required，effective target 不偽裝切換；同 Session 受控重啟後另驗證 | F |
| PM20 | DDE unknown quality 未批准／已批准 | 預設阻擋；limitation approval 綁source/review，仍不繞 E1 time/transport | D/F |
| KN01 | 已知工程沒有mode/payload批准 | 工程列保留但不可啟用；不要求Item/meterId | B/D/G |
| KN02 | 只有一工程成果 | 可先接此工程，合計coverage缺其他工程；不等全廠總錶 | G |
| KN03 | 只有kWh沒有kW | 功率不可用，不用累積值或改單位填滿 | D/F |
| KN04 | CL raw/default分類複製到KN | 拒絕未審跨廠物理身份／公式；不虛構KN部門 | B/E/F |
| KN05 | 工程結果無底層DDE／錶名冊 | 可按工程契約審查；DDE限制只適用真的選用physical bridge | F/G |
| KN06 | 首筆完整日報／counter首筆 | 前者可用完整日，後者仍需baseline；不捏造其他日期 | G |
| KN07 | main/feeder及raw/virtual一起挑 | E6邊界審核拒絕默認重複計入；無部門保持未配置 | D/F |
| KN08 | 一KN來源驗收失敗／roll back | 只停該新通道；CL及Solar保留，不替換CL數值、不刪accepted history | E/F |

提交規劃文件只證明已保存規格；適用 physical bridge 時才需要 Windows/DDE 驗證。隔離 Broker、Player focused tests、最終 pnpm verify 與正式 CLI analyze/validate 依實際實作範圍另行完成。額外 Go modules 測試要獨立記錄，不能假設 root verify 已代跑。

## 2026-09-16 工程別更新

G=add-kn-engineering-mqtt-sources，獨立完成工程source/period/provider，無須等CL physical現場盤點。A/B/C/D/E新增工程分支依G的gate與來源服務；F的KNP只擁有工程啟用關卡，PMQ只擁有選用physical profile。下列舊PM案例按physical前提保留；KN舊raw/SITE_LOAD/FEEDER前提不再適用，工程驗收以G所有KNE/EPR情境及KN-POWER-ROLLOUT為準。八工程UI與模式草稿可以先做，實際activation依每工程合約批准。舊72小時不當所有mode的硬門檻。

詳見 [新工程別契約](KN-ENGINEERING-CONTRACT.md) 與 [本輪Review](REVIEW-ENGINEERING.md)。
