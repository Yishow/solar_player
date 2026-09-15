# 跨發布端第二輪 Review 與驗證紀錄

## 結論與範圍

基準 main：`fd405ebc2957232b6c622071622b9c7d830a3a42`；原草稿：`1ed0f563d215929f3c010da90a43da3b1399f64b`。
本輪完成兩次文件／程式交叉審查：先從 Solar、DDE bridge、Player production/discovery 的實際方向確認責任，再對修訂後的需求、情境、tasks、tag register 與啟用門檻做一致性檢查。這是同一代理的 source-grounded review，不宣稱有獨立人員或另一個 review agent。

原五份提案均已增補，另開 F `plan-power-mqtt-publishing-and-kn-onboarding`。原需求與情境 IDs 保留；未改產品碼、正式主規格、現場配置或歷史，沒有 archive 或把 tasks 勾成完成。

**文件修訂審查已完成；官方 CLI 驗證與 runtime／現場驗收尚未完成。** 這不是宣稱整包已通過 apply/launch gates。

## Finding → 修訂與覆蓋

| ID | 原問題或這輪發現 | 修訂位置／覆蓋 |
|---|---|---|
| R01 | 「共享中央 Broker」可能被讀成同時改所有程序 | C DHC-R1/R5、MQTT-OWNERSHIP：只改 Player receiver，不改 publishers/Broker daemon |
| R02 | Solar canonical 又進 generic onboarding | B DHR-R5、D DHM-R4：managed reuse；同時保留非標準 Solar 非 owned identity 的審查路徑 |
| R03 | 固定 factory/cl/、factory/kn/ 不涵蓋真 Solar/opc topics | B DHR-R6、明確批准 profiles；禁止默擴 #/opc/#，coverage mismatch 可見 |
| R04 | opc 名稱容易誤認為現在讀 OPC DA/UA | F PMQ-R1、S18：main.go 實際 DDE；VIEW 同使用者同 Session，KN source 技術待確認 |
| R05 | opc_mqtt_bridge 固定 Client ID、legacy topic 缺 site | PMQ-R2：部署唯一穩定 Client ID、opc/v1/{site}、同 topic 單一 active owner |
| R06 | publish ts/readAt 被誤當 source time；retained replay 當新讀值 | PMQ-R3/R7、DHM-R4：四種時間分離；E1 source-required/受審核估計原樣保留 |
| R07 | 新封包宣稱精確，但舊 reader/engine 已 float64/round | PMQ-R3：從 DDE text 端保留 decimal lexeme；不能事後 stringify 假還原精度 |
| R08 | 虛擬加總當物理錶、成員 reset/改組、空公式 | PMQ-R5：calculation-only、非空且全成員有效；正式區間量仍由 raw/E1/E2/E6處理 |
| R09 | 只選 $.value 就宣稱支援新協議 | PMQ-R6：共用 bounded envelope gate、綁 registry/token、失敗不 fallback |
| R10 | KN 預留名字被當真實 Item，或將 CL 點位直接複製 | KNP-R1/R2、tag-register：sourceItem/meterId=null、disabled、code-default 與現場審核區分 |
| R11 | subscriber sent、publisher ACK、receiver accepted 混為一談 | DHR-R6、PMQ-R4、MQTT-OWNERSHIP：per-client/per-generation/per-stage證據分開 |
| R12 | DUP=false 重送及同 sampleId 改值繞過去重 | PMQ-R4：持久有界sample身份檢查、超齡拒絕、same-id不同body衝突；真新讀取可有相同值 |
| R13 | publisher 保存 broker 設定被當 active target 已改 | PMQ-R2 與 F task2.6：無驗證過熱切換時明示受控重啟，不假成功 |
| R14 | DDE read成功被當sourceQuality=good | PMQ-R3/R6、F task3.6：unknown保留；unreportedQualityPolicy預設block，逐來源limitation approval不放寬E1 |

上述是**規格層修正**；對應產品實作與回歸工作仍在 tasks，不能讀成現行 runtime 已修好。

## 實際執行的文件檢查

[planning-checks.json](planning-checks.json) 保存檢查結果。檢查包含六個 change 的必要 artifacts、9份 delta spec、41項 requirement、133個 GIVEN/WHEN/THEN 情境、唯一 IDs、原情境保留、121項未勾選任務及編號、內部檔案連結、允許路徑、JSON讀取與登錄一致性。

原30個 planning檔案先用 Git blob SHA 與既有交付包／固定分支 objects 核對，再在隔離資料夾修改。空白檢查使用獨立暫存 Git index 的 `git diff --check`；只加入明列 planning路徑，不接觸使用者工作目錄、不跑 git add .，沒有建立本機commit。

計畫 fixture另外檢查20個CL raw候選、10個virtual成員、6個KN預留模板全部停用；9個獨立topic-shape斷言確認site與raw/virtual/Solar層級不混，Decimal例子確認0.125差值。這是**離線計畫資料檢查，不是 production parser、MQTT broker 或DDE測試**。另人工核對20 raw代碼與10virtual公式對上S19；CL實體歸屬、盤別與CT/PT仍未查驗。

## 沒有執行／未具備的 Gate

| Gate | 狀態 |
|---|---|
| OpenSpec/Spectra official analyze/validate | 環境找不到 openspec/spectra CLI；未執行，不以自訂檢查取代官方通過 |
| pnpm verify／Player focused tests | 本輪無產品碼實作，未執行 |
| opc_mqtt Windows/DDE、solar_mqtt_go tests | 未執行；非Windows stub不可當同Session實測 |
| 隔離Broker publish/SUBACK/reconnect/replay測試 | PM01–PM20列為實作後必測，未連線／未發送 |
| KN現場點位、72小時觀察、兩個午夜、計量簽認 | 尚未取得，保持disabled；不宣布KN live-ready |
| 人工UI與展示驗收 | 沒有以這輪規格提交替代驗收 |

在具備 CLI 的完整 repo 中，依已安裝版本確認命令後逐 change 執行正式 validate/analyze；修正失敗再取得真實輸出。新 v1 入庫還須完成 F protocol gate、來源批准與 PM/KN tests；只有文件先進 branch，不直接部署。

## 剩餘現場決策與提交邊界

KN source協定／Item／主機Session、物理錶號、購電與全廠負載邊界、部門拓樸、CT/PT、時間／品質／更新週期都待現場提供。這些是刻意保留的 commissioning gates，不是用假值補滿的漏項。

此次依使用者要求，把原planning commit與本輪修訂整合成最新main之上的一條繁中commit；維持原branch，只有openspec/changes與docs/plans/data-hub-reception-ux。重寫branch前再次讀回main及branch head；不修改main、不自動開PR、不合併、不部署。最終commit SHA由GitHub回傳，不在commit內容中自我引用。
