# 驗證紀錄｜fix-guided-source-mutation-guards

本檔記錄本案 apply 期間實際執行的驗證與其輸出界線。未實跑的項目不得在此宣稱通過。

## 1.1 基準固定（2026-09-09）

- `git fetch origin main` 後：`git rev-parse HEAD origin/main` 兩者皆為 `26c5598e590c05d993833b3b890149657ede13ab`。
- `git rev-list --left-right --count origin/main...HEAD` → `0	0`，本機與 GitHub main 無分岐。
- `git status --short` 僅有未追蹤項目：`docs/reviews/2026-09-08-mqtt-runtime-safety-review.md`、`openspec/changes/fix-guided-source-mutation-guards/`、`openspec/changes/fix-reviewed-power-event-ordering/`。無他人未完成工作被覆蓋。

F1 於此 head 仍存在（原始碼確認，非重新實跑 review 的隔離資料庫實驗）：
- `apps/server/src/services/guidedMqttMappingService.ts:148-151` 在 token、snapshot、ownership 檢查後直接 `saveMeterSource` 與 `persistAppliedSelector`，整個 `applyGuidedMapping` 未呼叫 `readSourceImpact`，亦未讀取 persisted previous source。
- 對照 `apps/server/src/routes/meter-sources.ts:56-60` 在同一交易內對 `(previous.enabled && !draft.enabled) || draft.metricKey !== previous.metricKey` 呼叫 `readSourceImpact`，並依 `impact.unknown` 分派 `E1_SOURCE_IMPACT_UNKNOWN` / `E1_SOURCE_IN_USE`（HTTP 409）。

本案變更範圍：`apps/server/src` 內 guided apply 與來源相依 guard 的最小收斂及其測試，加上本案 `openspec/changes/fix-guided-source-mutation-guards/` 文件。不改 schema、API 形狀、前端與部署設定。

## 1.2／1.3 失敗回歸（RED，實跑）

新增案例在補 guard 前全部以「缺少預期例外」失敗，證明修復前的行為：

- `src/services/guidedMqttMappingService.test.ts`：4 個 `M2-R16` 案例（草稿引用下停用、derived metric 佔用原目的時改名、preview 後新增引用、impact lookup 不可讀）→ `AssertionError: Missing expected exception` ×4。
- `src/routes/mqtt-guided-activation.test.ts`：2 個 `M2-R16` 案例 → HTTP `200 !== 409`；停用案例的回應 body 實際為 `"applied":true,"source":{...,"enabled":false}`、`"saved":true`，等於在真實 route 上重現 F1（review 只在 service 層重現過）。

Fixture 前置修正（無 guard 時仍全綠）：service 測試的 in-memory schema 補上 `006/007/009/021/027`，否則 `readSourceImpact` 因缺表而永遠 fail-closed，拒絕原因無法歸因於真實 consumer。

## 3.1 相依測試（實跑，2026-09-09）

指令（tasks 指定，未增減 target）：

```
pnpm --filter @solar-display/server test src/services/guidedMqttMappingService.test.ts \
  src/services/sourceImpactService.test.ts src/services/meterSourceCatalogService.test.ts \
  src/routes/meter-sources.test.ts src/routes/mqtt-guided-activation.test.ts \
  src/routes/site-energy-profiles.test.ts
```

結果：`tests 59 / pass 59 / fail 0`（duration_ms 2859）。

### 既有測試的 fixture 調整與原因

補上 guard 後，5 個既有測試因 fixture 使用 `consumptionEnergy` 而被正確攔下——該 key 由 registered story／readiness consumer 引用（`readMetricUsage` 的 `addRegisteredConsumers`），因此直接來源路由今日同樣禁止停用它。這些測試要驗的是 shared topic、rollback、broker refusal 與 re-enable 後的封包接收，不是相依保護，故改用無 consumer 的目的地 `unconsumedPlantEnergy`，行為斷言原樣保留：

- `guidedMqttMappingService.test.ts`：`M2-R15 disabling one owner of a shared topic…`、`M2-R15 a mapping write failure during an enabled-state change…`
- `mqtt-guided-activation.test.ts`：`M2-R15 a disabled guided apply never reports itself active…`、`M2-R15 a broker refusal on a re-enable…`、`M2-R15 a re-enabled source receives a production packet…`

這是行為擴大的直接後果，非測試遷就實作：guided apply 現在與直接來源路由對同一 metricKey 得到相同結論。是否接受「registered page／readiness 引用的 metricKey 不能經 guided apply 停用」屬產品決策，需使用者確認。

## 3.2 Review 與交付 gate（實跑，2026-09-09）

### Standards self-review（audit 紀律）

- 型別混淆：`assertDestructiveSourceMutationAllowed` 的 `next.enabled` 只在兩個入口都完成寫入驗證後才被讀取；`validateMeterSourceWrite`（`packages/shared/src/meterReading.ts:110`）與 `reviewedDraft` 皆要求 `typeof enabled === "boolean"`，字串 `"false"` 無法把破壞性轉換偽裝成非破壞性。修正一處 finding：`routes/meter-sources.ts` 原本用 `as unknown as MeterSourceDefinition` 的雙重轉型，改為與相鄰 `saveMeterSource` 呼叫一致的 `as Record<string, unknown> & MeterSourceDefinition`。
- 危險預設：無 previous 即跳過檢查是刻意的（註冊沒有既有目的地可保護），其餘皆 fail-closed；`readSourceImpact` 查詢失敗回 `unknown` 而非空集合，guard 據此拒絕。
- 靜默失敗：guard 以拋例外表達結果，呼叫端無法靠忽略回傳值繼續；兩個入口都在同一交易內、任何 `saveMeterSource` / audit / selector / receipt 寫入之前執行。

### Spec review

`specs/guided-mqtt-tag-mapping/spec.md` 的 7 個 scenario 皆有對應測試。補上一項 finding：Scenario 1 的 `AND the existing source-impact read continues to identify the blocking draft` 原先無斷言，已在 route 測試加上 `GET /api/data-hub/source-impact` 的 `canMutate=false` 與 `[["draft","overview"]]` consumer 斷言。

### Gate

- `openspec validate fix-guided-source-mutation-guards --strict` → `Change 'fix-guided-source-mutation-guards' is valid`。
- `pnpm verify` → 全部 stage 通過：build、bundle-budget、shared（pass 166）、server（pass 1020）、web（pass 1472）、deploy（pass 110 / skipped 1）、server-runner（pass 14）；fail 0。

## 3.3 交付範圍核對（2026-09-09）

`git status --short` 追蹤中的修改僅 5 檔，`git diff --stat` 為 550 insertions / 28 deletions，其中程式碼變更本身極小：

| 檔案 | 性質 |
|---|---|
| `apps/server/src/services/sourceImpactService.ts` | +27：新增共用的 `assertDestructiveSourceMutationAllowed` |
| `apps/server/src/services/guidedMqttMappingService.ts` | +11/-2：guided 首次 apply 在寫入前呼叫共用 guard |
| `apps/server/src/routes/meter-sources.ts` | +2/-7：直接來源路由改用同一決策（淨減行） |
| `apps/server/src/services/guidedMqttMappingService.test.ts` | 新增 10 個 `M2-R16` 案例＋fixture 調整 |
| `apps/server/src/routes/mqtt-guided-activation.test.ts` | 新增 3 個 `M2-R16` 案例＋fixture 調整 |

未追蹤項目 `docs/reviews/2026-09-08-mqtt-runtime-safety-review.md`、`openspec/changes/fix-reviewed-power-event-ordering/` 為 apply 開始前既有（見 1.1），不屬本案交付。無 schema migration、API 形狀、前端或部署設定變更。

仍需人工驗收：本案只有自動化伺服器測試證據，沒有瀏覽器或現場 broker 驗證；「registered page／readiness 引用的 metricKey 不能經 guided apply 停用」的產品意涵須由使用者確認。依 repo workflow，archive 後仍須取得使用者確認才 commit；本次未 commit、未 push、未部署。
