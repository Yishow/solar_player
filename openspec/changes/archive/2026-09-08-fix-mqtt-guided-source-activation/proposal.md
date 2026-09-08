## Why

2026-09-08 review 發現 MQTT 導引的「收到資料、選欄位、保存、正式接收」尚未接成完整流程：新對應不會啟動訂閱、功率來源會繞過 tag selector、正式頁面沒有傳入樣本，而且測試發送的確認目的地與後端實際目的地可能不同。這些問題會讓使用者無法接入資料，或在錯誤的確認資訊下發送正式 MQTT 訊息。

## What Changes

- R1：保存來源後協調正式訂閱；分開回報已保存、訂閱生效及已收到資料，訂閱失敗可重試而不重複保存。
- R2：已審查的功率與電量來源共用 selector 解析契約；功率只更新相容的 live metric，不寫成累積電量。
- R3：從正式 Data Hub 入口接通已授權觀察範圍、有限樣本、來源定義、欄位選擇與套用；不得用測試 fixture 代替產品資料。
- R4：真正測試發送前，顯示後端解析出的實際 broker、Topic、廠區、來源與待送值；確認後目標變動須重新確認。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `guided-mqtt-tag-mapping`：補強保存後啟用、功率 selector 與正式入口的整合驗收契約。
- `guided-data-source-onboarding`：補強真实樣本交接與實際發送目標的確認契約。
- `mqtt-observation-catalog`：補強可取回的樣本、正式 capture 生命週期與未映射資料的可達性。

## Impact

涉及 `apps/server/src/routes/site-energy-profiles.ts`、`routes/mqtt-captures.ts`、`routes/settings-mqtt.ts`、MQTT observation/mapping/ingest services、`MqttClientService`，以及 web 的 `GuidedOnboardingPanel`、`GuidedMqttMappingPanel` 與 shared selector/API 型別。沿用目前管理權限與既有 broker 設定；回應新增狀態需同步 shared、server、web。

## Review Baseline and Evidence

包含起點 `8323c33c12464adf1b5f42670d82d4fe7ae03a7c`，比對範圍為 `8323c33c^..eebfc62e5c08cb58770e060d23b471ac6420673a`。本機 HEAD、origin/main 與 GitHub main 在 review 開始時一致。證據與驗證限制見 `docs/reviews/2026-09-08-energy-authoring-review.md` 的 R1–R4。

## Non-goals and Delivery Boundary

本次只提出規格，不修改應用程式、不操作正式 broker、不回填 accepted history、不調整設備部署。Apply 不新增其他協定、不開放任意主機或 `#` 訂閱、不改 managed Solar ownership。需要 discovery 時只使用已批准範圍與獨立短期連線。所有實作進度只記錄於本 change 的 `tasks.md`；通過既有測試不代表新回歸情境已通過。
