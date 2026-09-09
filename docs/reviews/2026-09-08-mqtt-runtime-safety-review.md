# MQTT Runtime Safety Code Review — 2026-09-08

## 結論與範圍

本次確認 2 項仍可重現的 P2 問題，並建立 2 個有界 OpenSpec 修復提案。這是 review 與提案交付，不是修復完成；產品程式碼與正式資料沒有修改。

Repository：`Yishow/solar_player`，default branch：`main`。起點包含 `8323c33c12464adf1b5f42670d82d4fe7ae03a7c` 本身；review head 為 `26c5598e590c05d993833b3b890149657ede13ab`。起點的第一個 parent 為 `13535147ad47613cf80b2321d12cb131b30264ab`，實際差異範圍為 `8323c33c^..26c5598e`，含合併提交共 55 個 commits。差異盤點為 365 files、36,205 insertions、732 deletions；這不是宣稱逐行審完全部 365 個檔案。

開始時 GitHub main、本機 HEAD、main 與 origin/main 一致，工作目錄乾淨；交付前再查仍為相同 head。行號均固定對應此 head。

檢查重點包括來源寫入與 ownership、正式 MQTT ingestion、期間／歷史 consumer、profile preview/readiness，以及先前兩輪 review 的修復。已解決的 R1–R10、N1–N4 不重新列為未修 finding；沒有足夠證據的相鄰疑點未加入提案。先前報告位於：
- `docs/reviews/2026-09-08-energy-authoring-review.md`
- `docs/reviews/2026-09-08-energy-authoring-followup-review.md`

依 code-review skill 分 Standards 與 Spec 兩軸。此次工具沒有可用的獨立 subagent，兩軸由同一 reviewer 分別檢查，不能當作獨立雙人 review。

## Standards

已確認的 repo 規範違反：0；另列的 code-smell judgment：0；本軸最高嚴重度：無。

這只表示此次聚焦範圍沒有另外提出可證明的規範違反，不代表整個差異沒有維護性風險。兩個下述行為問題歸在 Spec，不再以「guard 分散」等理由重複計數。已參考 `docs/ops/workflow.md`、`conventions.md` 與 `judgment.md`。

## Spec

Confirmed findings：2；最高嚴重度：P2。兩項均有原始碼資料流與隔離執行證據，信心高；不主張已造成現場故障。

### F1 — [P2] Guided apply 能停用仍被草稿引用的來源

**主要位置：** `apps/server/src/services/guidedMqttMappingService.ts:148–151`。  
**對照位置：** `apps/server/src/routes/meter-sources.ts:56–60`；相依查詢在 `apps/server/src/services/sourceImpactService.ts`。

一般來源路由在 enabled 由 true 轉 false，或 metricKey 改變時，會用原目的身分查 `readSourceImpact`；有 consumer 回 `E1_SOURCE_IN_USE`，查不明回 `E1_SOURCE_IMPACT_UNKNOWN`，HTTP 409。Guided 首次 apply 經過 token、snapshot 與 ownership 檢查後，直接 `saveMeterSource`、`persistAppliedSelector`，沒有同一個 impact guard。來源／mapping 快照也不包含稍後新增的頁面引用。

**觸發與實測：** 在隔離資料庫建立已審查、enabled 的 KN `reviewPower`，於 Overview draft 加入它的 binding。`readSourceImpact` 已回 `canMutate=false`，但重新 preview／apply `enabled=false` 仍成功：

```json
{"canMutate":false,"consumers":[{"kind":"draft","itemId":"power","metricKey":"reviewPower","pageId":"overview"}],"applied":true,"sourceEnabled":false,"mappingEnabled":0}
```

**影響：** 管理者能從另一個合法寫入入口繞過既有「來源仍在使用」保護，停止該 mapping 的正式接收而留下引用。這不是任意未授權使用者攻擊，也不是所有新建來源都會失敗。

**規格依據：** `guided-data-source-onboarding` 的 U2-R5／U2-R5-S02 要求破壞性來源操作揭露依賴並阻擋未解決的刪除；`guided-mqtt-tag-mapping` 的 M2-R9 要求原子套用與拒絕零寫入。本案將停用／改目的身分的導引行為補成明確可驗收要求。

**修復方向：** 兩寫入入口共用最小相依決策，在首次 apply 的既有交易內，寫來源／audit／receipt 前重查 persisted previous source 的原 scope/key；已知引用或未知影響都拒絕，runtime 不得啟動。保留合法新建、改名稱、重新啟用與冪等重送，不擴 preview 的 ownership-only 409 分類。

**證據界線：** 本次實際重現的是 draft dependency 與 service apply；直接路由的 409 由原始碼確認。Live page、derived dependency、preview 後新增引用與 HTTP/runtime 零變更的完整矩陣已列為修復回歸要求，尚非本次全部實跑。

### F2 — [P2] 較舊的功率封包會覆蓋最新值與時間戳

**主要位置：** `apps/server/src/services/mqttMeterIngest.ts:232–240`。  
**呼叫鏈：** `apps/server/src/mqtt/MqttClientService.ts:808–809` 的 callback 呼叫 `handleMessage`；後者於 `:999–1045` 接受 mapped 結果並寫入 live row。

已審查 power-gauge 在 selector/admission/scale 通過後，直接回 `liveUpdated=true`，沒有與已保存的觀測時間比較。Runtime 看到 accepted／liveUpdated 便 unconditional upsert。相對地，累積電量的 `meterReadingService.ts` 有 late-event 判斷；功率刻意不寫 energy history，但缺少獨立的 live 排序保護。

**觸發與實測：** 在隔離資料庫建立已審查 KN power mapping，直接呼叫 production callback 所使用的 `MqttClientService.handleMessage`，先送 20 kW／10:02Z，再送較晚抵達的 5 kW／10:01Z；兩次均帶 `dup=false, qos=1, retain=false`：

```json
{"before":{"value":20,"timestamp":"2026-09-08T10:02:00Z"},"after":{"value":5,"timestamp":"2026-09-08T10:01:00Z"},"acceptedEnergyRows":0}
```

**影響：** 當封包來源觀測順序與抵達順序不同，畫面所稱的最新功率與 freshness 會退回舊資料。不是功率一定要上升；應保持單調的是觀測時間，而不是 kW 值。

**規格依據：** `data-hub-task-workspace` U1-R4 的 latest value／freshness、E1 的來源時間證據與 power/energy 分流，以及 M2 的 reviewed power production 契約。現有規格沒有把 power live 的所有等時刻／倒序細節逐條寫清楚；新 delta 明確補齊這個契約，不假裝已有一條完全相同的 power 排序條文。

**修復方向：** 沿用 persisted `(metric_scope, metric_key)` live row，在同一交易內比較有效觀測 instant，只有首筆或較新觀測更新；等時刻相同為 no-op，不同值為 conflict，較舊保留原列。重啟後仍有效，不以 source revision 自動重設時間軸。功率仍不進 accepted energy、energy quarantine 或 baseline；legacy 與累積電量路徑保持原行為。

**證據界線：** 這次呼叫的是正式 callback 使用的 handler，沒有經真實網路／broker，也沒有實際瀏覽器檢查。重啟、等時刻衝突、known-time retained、不同 offset 等是後續回歸矩陣，不能冒充已測結果。

## 修復提案

| Change | Finding | 規劃產物 |
| --- | --- | --- |
| `fix-guided-source-mutation-guards` | F1 | proposal、design、guided-mqtt-tag-mapping delta、tasks |
| `fix-reviewed-power-event-ordering` | F2 | proposal、design、meter-reading-contracts delta、tasks |

路徑為 `openspec/changes/<change>/`；各有 `.openspec.yaml`，使用現有 `spec-driven` schema。第一案 10 個、第二案 11 個 implementation tasks 全部未勾選。兩案可獨立實作；建議先處理來源停用保護，避免操作本身切斷仍被引用的資料。

本次透過檔案工具建立 artifacts，再讀取 OpenSpec 的 status／instructions 與 dependency artifacts，最後逐案 strict validate。沒有 apply、archive、commit、push 或建立 PR；不修改目前 `openspec/specs/` 主規格。

## 已執行的驗證

**Focused tests：48 pass、0 fail、0 skipped。** Pretest 的 shared build 也成功。

```sh
pnpm --filter @solar-display/server test \
  src/mqtt/mqttPowerSelectorIngest.test.ts \
  src/services/periodConsumptionService.test.ts \
  src/routes/metrics-history.test.ts
```

**隔離重現：2 個 node:test cases 成功確認錯誤現象。** 執行入口是從 `apps/server` 執行 `node --import tsx --input-type=module -e`，直接匯入 `display-pages-asset-governance.test-support.ts`、guided service、impact service 與 MqttClientService。Helper 在 OS temporary directory 建立／遷移／seed 測試 SQLite，after hook 關閉並清理；沒有使用 repo 正式 `data/`。測試名稱：

- `review reproduction: guided disable bypasses a known draft dependency`
- `review reproduction: older power replaces a newer live observation`

這兩個 cases 的 assertions 是確認現有錯誤能重現，不是修復後的 green regression，也未新增正式測試檔。精確輸入、前置條件與實測輸出見 F1/F2。

**完整交付檢查：`pnpm verify` 實際執行，最後回報 `[verify] all stages passed`。** 階段為 build、bundle-budget、shared、server、web、deploy、server-runner。此輪可見輸出包含 web 1472 pass、deploy 110 pass／1 skipped、server-runner 14 pass；前段輸出被工具截斷，這裡不推估其他階段的測試數。Deploy 的跳過案例為 `real flock releases the monitor slot without leaking it to Firefox`。

**OpenSpec：** 兩案各執行 `openspec validate <change> --strict`，均回 `is valid`。Planning artifacts 齊備不等於 implementation tasks 完成。

**未執行／限制：** 無真實 broker publish、現場設備驗收、瀏覽器／FHD witness、獨立第二 reviewer 或新增修復後的 red/green cycle。本次沒有 UI 修改；不以單元測試代替視覺／現場驗收。受工具攔截的批次檢查未計入成功證據；已成功的個別命令如上。

## 交付 checkpoint

交付只應包含本報告與兩案共 10 個規劃檔案，全部未提交。`git diff --check` 對 tracked changes 無錯誤；新檔另外由 OpenSpec strict validation 與 read-back 檢查。後續 apply 必須重新核對最新 main，再建立真正會先失敗、修復後通過的 regression，不能直接把本次「確認 bug 存在」的測試當驗收。
