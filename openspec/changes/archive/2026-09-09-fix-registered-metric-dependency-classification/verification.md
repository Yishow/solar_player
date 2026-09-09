# 驗證紀錄｜fix-registered-metric-dependency-classification

本檔記錄本案 apply 期間實際執行的驗證與其輸出界線。未實跑的項目不得在此宣稱通過。

## 1.1 基準固定（2026-09-09）

- `git rev-parse HEAD` → `dfd8d2b367c06aeabf5687251615faf3af49b729`（本機 `spectra(fix-guided-source-mutation-guards)` commit）。
- `git rev-parse origin/main` → `26c5598e590c05d993833b3b890149657ede13ab`；`git rev-list --left-right --count origin/main...HEAD` → `0	1`，本機領先 1 個尚未 push 的 commit，無分岐。
- 共用 guard 已在樹上：`apps/server/src/services/sourceImpactService.ts` 的 `assertDestructiveSourceMutationAllowed` 由 guided apply 與直接來源路由共同呼叫。

**他人進行中的工作（不得覆寫）**：工作目錄同時存在 `fix-reviewed-power-event-ordering`（F2）的未提交實作，涵蓋 `apps/server/src/mqtt/MqttClientService.ts`、`apps/server/src/mqtt/mqttPowerSelectorIngest.test.ts`、`apps/server/src/services/mqttMeterIngest.ts`、`apps/server/src/services/mqttMeterIngest.test.ts` 及三個新增的 mqtt 檔案。本案不觸碰這些路徑。

### 恆真阻擋的實測重現

於隔離的 in-memory 資料庫（完整 migration、零頁面綁定、零 draft、零 derived 輸入）對 KN `consumptionEnergy`：

```
impact.canMutate = false | consumer kinds = ["live","live","live"]
usage consumerTypes = ["readiness","readiness","story"]
widget rows (真正的頁面綁定) = 0
直接路由 POST: 201
直接路由 DELETE(停用): 409 E1_SOURCE_IN_USE
導引式 apply(停用): 409 E1_SOURCE_IN_USE
```

三個阻擋 consumer 全部被標成 `kind: "live"`，但它們在 metric usage 的 `consumerType` 實際是 `readiness`、`readiness`、`story`，widget 列為 0。也就是說阻擋完全來自程式碼定義的 registered 期望，沒有任何可解除的頁面綁定；兩個寫入入口皆回 HTTP 409 `E1_SOURCE_IN_USE`，且沒有任何操作能讓它變為可行。

本案變更範圍：`apps/server/src/services/sourceImpactService.ts` 的 consumer 分類、`apps/server/src/routes/site-energy-profiles.ts` 的來源影響讀取回應欄位，以及相關測試。不改 metric usage 服務的列產生邏輯、不改前端、不動資料表。

## 1.2／1.3 失敗回歸（RED，實跑）

補分類前，5 個新案例全部以正確理由失敗：

- `sourceImpactService.test.ts`：`U2-R5 a destination carrying only registered expectations stays mutable and still discloses them` → `AssertionError: an expectation no operator action can clear must not block mutation, false !== true`。
- `guidedMqttMappingService.test.ts`：`M2-R16 disabling/moving a destination only registered expectations reference stays available` → 於 `assertDestructiveSourceMutationAllowed` 拋 `E1_SOURCE_IN_USE`。
- `meter-sources.test.ts`：`U2-R5 disabling/moving a destination only registered expectations reference stays available` → HTTP `409 !== 200`，body `{"success":false,"error":"E1_SOURCE_IN_USE"}`。

每個案例都先斷言 GIVEN（該 metricKey 有 registered 列且 `consumerType === "widget"` 的列為 0）並通過，才走到失敗點，因此阻擋確實來自 registered 期望而非被忽略的真實綁定。

### Fixture 修正：改用在兩種環境都成立的目的地

首版 RED 案例以 `consumptionEnergy` 作為「只有 registered 期望」的目的地。實測發現 `buildApp()` 會 bootstrap derived metric registry（`derived_metric_inputs` 由 0 筆增為 36 筆），該 key 在已啟動的伺服器中確實擁有 `selfConsumptionRatio` 等真實 derived 引用，本來就該被擋——只有在未啟動 app 的 harness 裡才是 registered-only。

改用 `todayGeneration`：在 migrations-only 與 migrate+seed+buildApp 兩種環境下皆為 registered-only，且未被 Solar adapter 或 derived registry 擁有。涉及 `sourceImpactService.test.ts`、`guidedMqttMappingService.test.ts`、`meter-sources.test.ts`、`site-energy-profiles.test.ts`。這是修掉一個會誤導後人的 fixture 陷阱，不是放寬斷言。

## 2.x 分類收斂

`readSourceImpact` 改為先取得 metric usage 的完整列，再依既有的 `consumerType` 分流：`widget` 列進入阻擋集合（`kind: "live"`），`story`／`readiness` 列進入新的 `registeredExpectations` 欄位。查詢失敗路徑同樣回 `registeredExpectations: []`。`metricUsageService.ts` 未修改（`git status` 為空）。

共用 guard 的呼叫點與本體皆未變動：`git diff` 對 `guidedMqttMappingService.ts`、`routes/meter-sources.ts` 為空，`sourceImpactService.ts` 的 diff 不含 `assertDestructiveSourceMutationAllowed` 或 `E1_SOURCE` 相關行。對第一案兩個測試檔的變更為純新增 63 行、零刪除，`mqtt-guided-activation.test.ts` 完全未動；第一案的 13 個 `M2-R16` 案例（含零寫入與零 subscription reconciliation 斷言）全數維持通過。

2.4 的三種阻擋機制各自獨立證明：測試在加入引用後斷言阻擋集合的 kind 集合恰為 `["draft"]`、`["live"]` 或 `["derived"]`，再驗證 HTTP 409 `E1_SOURCE_IN_USE` 與零寫入快照；`display_page_stage_configs` 被移除時回 `E1_SOURCE_IMPACT_UNKNOWN`。live 案例明確建立 registry 列與 default playback profile 關聯，因為只有 live stage config 不等於已發布頁面。

## 3.1 相依測試（實跑，2026-09-09）

指令（tasks 指定，未增減 target）：

```
pnpm --filter @solar-display/server test src/services/sourceImpactService.test.ts \
  src/services/guidedMqttMappingService.test.ts src/services/meterSourceCatalogService.test.ts \
  src/routes/meter-sources.test.ts src/routes/mqtt-guided-activation.test.ts \
  src/routes/site-energy-profiles.test.ts
```

結果：`tests 67 / pass 67 / fail 0`（duration_ms 3066）。

## 3.2 Review 與交付 gate（實跑，2026-09-09）

### Standards self-review（audit 紀律）— 修正 1 項 finding

**危險預設（已修）**：初版以 `consumerType !== "widget"` 判定結構性期望，等於「未來新增的 consumer 類型一律不阻擋」，是 fail-open。若日後加入代表真實可解除綁定的第四種類型，它會被靜默排除在阻擋集合之外，保護就此失效。改為明確列舉 `STRUCTURAL_CONSUMER_TYPES = ["story", "readiness"]` 並以型別謂詞判斷，未列舉的類型一律進入阻擋集合——把新種類推定為真實相依是可回復的錯誤，把真實相依漏出阻擋集合不是。

其餘檢查：`registeredExpectations` 的成員型別由該列舉推導，不會出現 `widget`；查詢失敗路徑同樣回空陣列，非 `null`、非欄位缺漏；guard 仍以拋例外表達結果，呼叫端無法靠忽略回傳值繼續；`confirmResolved` 依舊只影響讀取端點，兩條寫入路徑都不傳它。

### Spec review — 修正 1 項 finding

`specs/guided-data-source-onboarding/spec.md` 的 `A failed impact lookup is still not an empty dependency set` 要求「兩個集合都回報為空」。原先只在寫入層驗證了 `E1_SOURCE_IMPACT_UNKNOWN` 與零寫入，讀取層的空集合未被斷言。已新增 `U2-R5 an unreadable lookup reports both sets as empty rather than omitting either`，斷言 `{canMutate:false, unknown:true, consumers:[], registeredExpectations:[]}`。

三個 scenario 的對應：registered-only 不阻擋（service 讀取 ×1、guided ×2、直接路由 ×2、端點 ×1）；可解除引用仍阻擋（直接路由的 draft／live widget／derived 三種各自斷言阻擋集合 kind，加上第一案既有的 guided 案例）；查詢失敗（讀取層 ×1、直接路由 ×1、第一案的 guided ×1）。

### Gate

- `openspec validate fix-registered-metric-dependency-classification --strict` → `Change 'fix-registered-metric-dependency-classification' is valid`。
- `pnpm verify` → 全部 stage 通過：build、bundle-budget、shared（pass 166）、server（pass 1038）、web（pass 1472）、deploy（pass 110）、server-runner（pass 14）；fail 0。

**證據界線**：`pnpm verify` 在同一工作目錄執行，該目錄同時含有 `fix-reviewed-power-event-ordering` 未提交的實作。gate 通過代表兩者並存時全綠，不等於本案已獨立於該工作驗證過。

## 3.3 交付範圍核對（2026-09-09）

`git status --porcelain` 追蹤中的修改僅 5 檔，全部屬於本案：

| 檔案 | 性質 |
|---|---|
| `apps/server/src/services/sourceImpactService.ts` | 唯一的產品程式變更：consumer 分類與 `registeredExpectations` 欄位 |
| `apps/server/src/services/sourceImpactService.test.ts` | 讀取層契約：registered-only 可變更、unknown 兩集合為空 |
| `apps/server/src/routes/meter-sources.test.ts` | 直接路由：registered-only 可停用／改目的地；三種可解除引用各自阻擋；unknown |
| `apps/server/src/services/guidedMqttMappingService.test.ts` | 導引式入口：registered-only 可停用／改目的地 |
| `apps/server/src/routes/site-energy-profiles.test.ts` | `/api/data-hub/source-impact` 的回應契約 |

未追蹤項目僅 `docs/reviews/2026-09-08-mqtt-runtime-safety-review.md`（先前 review session 的產物，兩案共同來源，尚未被任何 commit 收錄）與本案自身的 change 目錄。

範圍界線確認：`apps/web/` 與 `apps/server/src/services/metricUsageService.ts` 的 `git status` 皆為空，未動前端訊息呈現與 metric usage 的列產生邏輯；無 schema migration、無新增覆寫或確認參數、未調整 playback 註冊模型。

`fix-reviewed-power-event-ordering` 於本案 3.2 與 3.3 之間由另一 session 提交為 `dd78bce7`，其檔案已離開工作目錄；本案全程未觸碰那些路徑。目前本機領先 `origin/main` 兩個未 push 的 commit（`dfd8d2b3`、`dd78bce7`）。

仍需人工驗收：本案只有自動化伺服器測試證據，沒有瀏覽器驗證，也未在 `/data-hub` 的來源畫面實際操作一次確認訊息呈現（前端刻意不在本案範圍）。放寬後操作者可停用 playback 頁面預設卡片仍期望的來源，該取捨的產品意涵須由使用者確認。依 repo workflow，archive 後仍須取得使用者確認才 commit；本次未 commit、未 push、未部署。
