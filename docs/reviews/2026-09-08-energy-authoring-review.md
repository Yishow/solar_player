# Data Hub / Energy Authoring Code Review — 2026-09-08

## 結論與範圍

本次提出 10 項具體 findings，建議優先級為 5 項 P1、5 項 P2；分成 3 個有界 OpenSpec 修復提案。P1 為正常接入流程阻塞、實際發送目的地不一致或會導致錯誤期間口徑；P2 為特定設定／歷史範圍／品質與預覽狀態的錯誤。這不是「其餘程式保證無問題」的聲明。

Repository：`Yishow/solar_player`，default branch：`main`。起點包含 `8323c33c12464adf1b5f42670d82d4fe7ae03a7c`，review head 為 `eebfc62e5c08cb58770e060d23b471ac6420673a`；實際差異範圍 `8323c33c^..eebfc62e`，含合併進來的提交共 48 個。開始時 GitHub main、本機 HEAD 與 origin/main 一致，工作目錄乾淨。下列行號皆對應這個固定 head，不是未來 main。

方法：讀取變更與呼叫端、對照已整合的規格、追蹤正常使用路徑、執行既有測試。Findings 是目前原始碼的可定位控制／資料流程問題；本次未新增並執行專屬 red/green 回歸測試，也沒有用正式 broker 重現。提案內案例是後續 apply 的驗收要求，不冒充已跑過的結果。

## Findings

### R1 — [P1] 新 mapping 保存後沒有啟動正式訂閱

**位置：** `apps/server/src/routes/site-energy-profiles.ts:91–92`。

`/mqtt-mappings/apply` 直接回傳 `applyGuidedMapping`，該服務只原子保存來源、mapping 與 receipt，沒有通知 runtime。`MqttClientService` 的 desiredTopics 由啟動或顯式 subscribe 更新；既有 topics PUT 在 `routes/settings-mqtt.ts:702` 有 subscribe，新 route 沒有。

**觸發與影響：** 套用一個目前沒有任何 production filter 涵蓋的新 Topic，API 可以回報 applied，但不會因這次操作收到新 Topic；使用者還得重啟或手動 reload。這不是每個 Topic 必然失敗：已被現有 filter 涵蓋的 Topic 不需要額外訂閱。

**修復／驗收：** 保存交易完成後透過原 runtime owner 協調訂閱；回報 saved 與 active 的差異。Broker 拒絕後可重試，來源 revision 與 receipt 不能重複新增。

### R2 — [P1] 功率來源跳過已審查的 selector

**位置：** `apps/server/src/services/mqttMeterIngest.ts:187–190`。

`measurementKind === "power-gauge"` 在 selector 解析前直接 return null，隨後 `MqttClientService.ts:1053` 走只使用 `value_path` 的舊 parser；`PayloadParser` 不處理 tag-qualified array。

**觸發與影響：** 已審查的功率來源使用 path=value、tag=P1，而收到 `[{"tag":"P1","value":12.5},{"tag":"P2","value":99}]`。保存的 selector 能表達 P1，正式路徑卻無法從陣列的 plain value path 取數，導致功率不更新。問題不是所有 scalar 功率來源都不能用。

**修復／驗收：** 共用 selector 解析後依量測種類分流；P1 必須得到 12.5 與正確功率單位，缺／重複 tag 明確報錯，且不新增 accepted kWh 歷史。

### R3 — [P1] 正式 onboarding 入口沒有傳入可選資料

**位置：** `apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx:50`。

正式入口只渲染 `<GuidedMqttMappingPanel metricScope={scope} />`，未提供 payload、source 或 topic，也未在父層取得它們。子元件在 payload 缺少時 fields 為空，無法前進選欄位。測試直接給子元件 props 並不能證明正式入口可用。

**觸發與影響：** 使用者正常走到「已接收資料」，即使 broker 有流量也不能透過這個入口選欄位與完成對應。後端 capture 目前還缺真正 active discovery 與可供 UI 取回的完整樣本交接，不能只在父層塞固定示例了事。

**修復／驗收：** 從正式入口串起受權限保護的 approved capture、樣本 inspection、來源審查、preview/apply；未映射 Topic 必須可由隔離 discovery 在已批准範圍取得，不可用 `#`、猜測廠區 prefix 或改 production ownership 作捷徑。

### R4 — [P1] 真正測試發送的確認 Topic 與實際 Topic 不一致

**位置：** `apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx:57–74`。

確認文字用固定 `${scope}/${scope}-main` 與值 10000.125；實際呼叫 consumptionEnergy 的 publish endpoint，只傳 scope/value/retain。後端 `routes/settings-mqtt.ts` 解析目前資料庫 mapping 的 Topic 後發送，不使用畫面上的固定 Topic。

**觸發與影響：** 例如 mapping 是 factory/kn/main，確認卻显示 kn/kn-main。使用者同意的是不同目的地的資訊，封包可能進入正在使用的正式計量 Topic。本次沒有真的發送，也不主張已發生現場污染。

**修復／驗收：** 顯示後端實際解析的 broker/Topic/來源/值/payload/retain，確認綁定 target revision。目標改變就重新確認；preview/cancel 必須零 publish。

### R5 — [P1] 部門占比繞過設定生效日與期間邊界

**位置：** `apps/server/src/services/departmentSharesService.ts:39–44`；相關 helper 在 `:20–27`。

服務一律讀 active profile，再直接呼叫 shared `resolvePeriodConsumption`。相對地，後端 `periodConsumptionService` 會選取有效設定並檢查期內 profile 邊界，必要時回 partial/null 與 `PROFILE_REVISION_BOUNDARY`。占比路徑沒有這層保護。

**觸發與影響：** 本月中途改部門／電錶歸屬且讀值端點足夠時，占比可把最新設定套到整月並回 exact，但同期間總用電已因設定邊界回 partial。會出現同一畫面兩種統計口徑；服務處理閉月歷史時也不能直接套今日設定。

**修復／驗收：** 分子、分母與 site total 共用 effective profile/window/asOf，保留跨界與品質資訊；沒有連續性證據就不能給精確完整期間占比。

### R6 — [P2] 只用於自訂分母的電錶沒有被計算

**位置：** `apps/server/src/services/departmentSharesService.ts:45–54`。

建構 periodDeltas 時只迴圈 siteTotal 及 departments，漏掉只存在於 `shareBasis.memberChannelIds` 的來源。shared `resolveShareBasisIds` 明確支援 meter-set 分母，卻會因這筆 delta 未提供而回 unavailable。

**觸發與影響：** A 是總量 1000 kWh、B 是部門 100 kWh、C 是明確分母 400 kWh，C 不屬於 A/B 集合；資料齊全仍無法得到 B/C=25%。

**修復／驗收：** 必要 channel 為總錶、部門及分母成員聯集。C 缺資料時仍為 null，不改算 B/A=10%。

### R7 — [P2] daily-summary 的所有查詢範圍都被換成本月

**位置：** `apps/server/src/routes/metrics-history.ts:113–118`。

原先依 rangeParam 讀取 summaries，接著卻固定取得本月 `resolveDailyConsumptionSeries`，並用 `series.points.map` 作為整個回應日期集合，而不是依請求範圍合併。

**觸發與影響：** 有 active profile 時，day/week/year/total 都可能回本月日期；年度／total 的較早月份被丟掉，連那些日期的發電、減碳等欄位也消失。沒有 profile 的舊路徑不受這段 overlay 影響。

**修復／驗收：** 先遵守既有 requested-range 日期語意，再只補 consumption。五種範圍、跨月與其他能源欄位都要有 route 測試。

### R8 — [P2] 日覆蓋率把不連續或 asOf 之後的資料算完整

**位置：** `packages/shared/src/periodConsumption.ts:158–164`，呼叫點 `:369–370`。

`evaluateDailyCoverage` 只判斷 opening/closing 是否不同與邊界年齡，沒有同一 meter/revision/epoch、measurement kind、reset 或 asOf 條件；輸入又是原始 input.samples，未套用正式差值流程的排序及時間截止。

**觸發與影響：** 一天在換錶前開頭、換錶後結尾，正式日差值不能成立卻可能被算 covered；以舊 asOf 查詢已含較新樣本的集合時，也可能把之後日期算進去。這是 coverage 宣告錯誤，不等同整個月端點差值必然錯誤。

**修復／驗收：** 共用日可計算條件、排序及 asOf；測試換錶、reset、未來樣本與亂序，同時保留「月總量已知、每日分配不完整」。

### R9 — [P2] 正式 profile preview 沒有計算結果

**位置：** `apps/server/src/routes/site-energy-profiles.ts:56–58`。

Route 沒有傳 calculator，`siteEnergyProfileService.ts:73,91` 因此只回 calculator=null。UI 的 `SiteEnergySetupPanel.tsx:166` 則把缺少 calculator.period.valueKwh 顯示成尚無差值，即使所選來源已有完整期間端點。

**觸發與影響：** 使用者不能在真正套用前看到總量／分母／占比變化，且程式未計算與現場缺資料被混為一談。既有 token 與來源衝突檢查有作用，但不能取代數值預覽。

**修復／驗收：** 正式 API 使用 immutable review snapshot 計算，回真實 period/basis/quality；完整資料有值、缺基準有診斷、calculator failure 有錯誤，且沒有 production history/profile 寫入。

### R10 — [P2] 新設定是否 ready 取決於分母選單有沒有改動

**位置：** `apps/web/src/pages/DataHub/SiteEnergySetupPanel.tsx:285–289`。

空 profile 預設 incomplete（:34）；選總錶不更新 status，唯一把 status 改 ready 的地方是分母 select 的 onChange。`applyProfile` 直接保存 draft.status（`siteEnergyProfileService.ts:140`），發布檢查又看 active.status 是否 ready（`displayPagePublishingService.ts:1000`）。

**觸發與影響：** 新設定保留已正確的 site-main 預設值時，即使已選總錶也會保存 incomplete；切換分母卻只憑有總錶便可寫 ready，沒有判斷期間資料是否足夠。這會影響已指派該廠區的能源頁發布，並把完成狀態綁到不相關的操作事件。

**修復／驗收：** readiness 由後端驗證結構、審查與資料證據；測試 profile=null、保留預設值、等價草稿、單一讀值及 forged ready。UI 提供必要 coverage review，不要求「先選錯再選回」。

## 修復提案

| Change | Findings | 內容 |
| --- | --- | --- |
| `fix-mqtt-guided-source-activation` | R1–R4 | 正式接入、訂閱生效、功率 selector、真正發送確認 |
| `fix-energy-period-consumer-consistency` | R5–R8 | 有效期間口徑、自訂分母、歷史範圍、日覆蓋率 |
| `fix-site-energy-preview-readiness` | R9–R10 | 正式數值預覽、後端權威狀態與新設定流程 |

每案位於 `openspec/changes/<change>/`，包含 proposal、design、delta specs、tasks。建議先處理 MQTT 的正常接入與發送確認；期間計算可獨立推進，profile preview 接用相同期間核心。全部實作 tasks 保持未勾選；本次不 apply、archive、commit、push 或建立 PR。

## 已執行的驗證

1. `pnpm run build:shared`：通過。
2. 下列 focused server suites：44 tests、44 pass、0 fail、0 skipped。

```sh
pnpm --filter @solar-display/server test \
  src/services/guidedMqttMappingService.test.ts \
  src/services/periodConsumptionService.test.ts \
  src/services/siteEnergyProfileService.test.ts \
  src/services/siteEnergyProfileSourceReview.test.ts \
  src/services/mqttMeterIngest.test.ts \
  src/routes/energy-authoring-consumers.test.ts \
  src/services/energyAuthoringJourney.test.ts \
  src/routes/site-energy-profiles.test.ts \
  src/services/mqttObservationCatalogService.test.ts
```

3. `pnpm verify`：實際終端回報 all stages passed；階段為 build、bundle-budget、shared、server、web、deploy、server-runner。可見 tail 中 deploy 為 110 pass、0 fail、1 skipped，server-runner 為 14 pass、0 fail。未保存於回應的其他階段測試總數不推估。
4. `openspec validate fix-mqtt-guided-source-activation --strict`：valid。
5. `openspec validate fix-energy-period-consumer-consistency --strict`：valid。
6. `openspec validate fix-site-energy-preview-readiness --strict`：valid。

批次 OpenSpec 驗證遭工具攔下，以上改為逐案執行且成功。另一次 inline TS 重現命令被工具攔下，未執行，不能把它計入測試證據。沒有執行現場 broker 測試發送、新增回歸案例、FHD witness 或不熟悉系統的人工操作驗收。既有套件通過只表示原有測試仍通過，不能推翻上述未覆盖的整合路徑 findings。
