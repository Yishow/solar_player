# 2026-09-09 Source / Runtime Follow-up Code Review

## 基準與結論

使用者要求：從 `8323c33c12464adf1b5f42670d82d4fe7ae03a7c` 起 review，依 `.agents/skills/openspec-propose/SKILL.md` 起草修復，不實作。

Repository：`Yishow/solar_player`。開始與交付前重新讀取 GitHub main，均為 `abd99ba846c25de35100229452e17e2442552a10`；local HEAD 同步，起始 worktree clean。包含指定提交，範圍是 `8323c33c^..abd99ba8`，其起點 parent 為 `13535147ad47613cf80b2321d12cb131b30264ab`，共 58 個提交、387 個 changed paths。本文行號一律指 pinned review head，非未來會移動的 main。

確認 4 項 P2 行為缺陷，全部在隔離測試重現；整理為 3 個可獨立實作的 changes。P2 表示需要安排修復、但有特定觸發條件，不代表所有來源或全部現場都已中斷。本次沒有產品程式修改、正式資料操作、archive、commit 或 push。

Review 先檢查提交／差異清單、既有修復與規格，再深入 source impact、direct/guided source lifecycle、MQTT admission/activation/reception、period/history/profile 與相鄰 UI。不是對 387 個檔案逐行完成的無缺陷認證。Standards 與 Spec 分開檢查；本次追查未另列已證實的 Standards-only finding，下面四項均為行為／契約問題。未啟動獨立第二 reviewer，不能把本報告視為雙人簽核。

既有 `2026-09-08-energy-authoring-followup-review.md`、`2026-09-08-mqtt-runtime-safety-review.md` 的修復，以及 latest registered expectations 分流，均以目前 main 為準，不重複開舊問題。

## Findings

### D1 — [P2] 草稿依賴缺少 scope 比對，KN 引用會誤擋 CL 來源

**位置：** `apps/server/src/services/sourceImpactService.ts:78-79`；解析時捨棄 scope 的位置為 36-45。

`parseDraftBindings` 只留下 metricKey，而 `readSourceImpact` 搜出所有 draft 後仍只比 key。當 KN 草稿明確綁定一個 key，CL 恰有同名來源時，CL 的合法停用／改名也被當成仍被草稿使用。這與 `guided-data-source-onboarding` 的 U2-R5 scope 保護契約不符；live usage 已處理 scope，不能因此假定 draft 也有處理。

**實測：** 在隔離 seed DB 中，將 overview draft 設為 `regions.dataBindings.power.dataBinding={metricKey:"reviewScopedPower",scope:"kn",sourceType:"metric"}`，查詢 `{metricKey:"reviewScopedPower",metricScope:"cl"}`。結果 `canMutate=false`、有 KN draft consumer；shared destructive guard 對 CL enabled→disabled 拋 `E1_SOURCE_IN_USE`。

```json
{"canMutate":false,"consumers":[{"kind":"draft","itemId":"power","metricKey":"reviewScopedPower","pageId":"overview"}],"unknown":false,"registeredExpectations":[]}
```

**修復方向：** 比對 explicit scope+key；繼承裝置及 supported legacy 缺省 scope 保守保留，不臆測 device context。另測同 scope 仍阻擋、不同 explicit scope 放行、all/global、有效空值與 registered-only 不回歸。

**來源追溯：** `git blame` 指向範圍內的 `8768480c5`。

[固定版本程式](https://github.com/Yishow/solar_player/blob/abd99ba846c25de35100229452e17e2442552a10/apps/server/src/services/sourceImpactService.ts#L75-L79)

### D2 — [P2] 草稿讀不懂時回傳空依賴，未知影響被當成安全

**位置：** `apps/server/src/services/sourceImpactService.ts:47-48`。

JSON 解析失敗被 parser 的 catch 吞掉並回 `[]`，因此外層既有 unknown 分支不會執行。儲存資料損壞時，destructive guard 不是拒絕未知風險，而是放行。這是異常 persisted data 的 fail-open 路徑；本次沒有證明一般編輯器能直接保存壞 JSON，也不把這個假設當正常使用流程。

**實測：** overview draft 的 `config_json` 設為 `{invalid-json`。impact 回 `canMutate=true, unknown=false`；同一 shared guard 不拋錯，無法滿足 U2-R5「Unknown impact SHALL not be treated as no impact」。

```json
{"canMutate":true,"consumers":[],"unknown":false,"registeredExpectations":[]}
```

**修復方向：** impact-specific parsing 區分 valid-empty 與 unreadable，沿用 `E1_SOURCE_IMPACT_UNKNOWN`，保留拒絕零寫入；勿誤把合法空草稿或 supported legacy form 也當成損壞。補 direct 與 guided first apply，包括 preview 後草稿變壞的情境。

**來源追溯：** `git blame` 同樣指向範圍內的 `8768480c5`；D1 與 D2 共用同一 bounded change，但不是同一個失敗條件。

[固定版本程式](https://github.com/Yishow/solar_player/blob/abd99ba846c25de35100229452e17e2442552a10/apps/server/src/services/sourceImpactService.ts#L47-L48)

### D3 — [P2] 一般來源重新啟用只更新 DB，沒有恢復正式 MQTT 訂閱

**位置：** `apps/server/src/routes/meter-sources.ts:60-63`。

direct source write 在 transaction 中同步 source 與 topic mapping 後立即回 `{source}`，沒有把已提交的 topic 集合交給 runtime。guided apply 已有 post-commit activation，不能涵蓋 direct endpoint。若 runtime 在 source disabled 時啟動／重連，該 topic 根本沒被訂閱；之後 PUT enabled=true 雖成功保存，接收仍不會恢復，直到另一次外部協調或 restart。

**實測：** 使用 real route、real `MqttClientService` 和 `FakeMqttClient`，先透過既有 mapping helper 建立 disabled power source，再 connect runtime，最後以授權管理 HTTP PUT enabled=true。HTTP 200，source 與 mapping 都 enabled，但目標不在 active topics，subscribe 呼叫數未增加。

```json
{"status":200,"sourceEnabled":true,"mappingEnabled":true,"runtimeSubscribed":false,"newSubscribeCalls":0}
```

**修復方向：** direct write 成功提交後以完整 committed enabled topic set 協調同一 runtime；保留 shared-topic 其他 owner、managed topics、disconnected desired state 與失敗後重試。broker IO 不放 SQL transaction 內；保留 `{source}`，不因 broker 失敗倒稱保存未成功，也不新增虛假的 observed 狀態。

**來源追溯：** 保存後直接回應的程式由範圍內 `71266e44b` 引入。新增 subscription 恢復是本案；不擴大 mapping transport／改名功能。

[固定版本程式](https://github.com/Yishow/solar_player/blob/abd99ba846c25de35100229452e17e2442552a10/apps/server/src/routes/meter-sources.ts#L60-L63)

### D4 — [P2] 已收到的功率資料仍被回報為尚未接收

**位置：** `apps/server/src/services/guidedMappingActivationService.ts:56-62`。

`readGuidedMappingReception` 不分 measurementKind，只查 `meter_readings_accepted`。reviewed power 按現有規格只更新 live，不應寫入 energy history，所以 power 永遠無法以正確種類的證據得到 observed=true。既有 guided response 使用這個 reader，前端 `GuidedMqttMappingPanel` 依 observed 顯示尚未收到資料。這不是訂閱未生效，也不能用 SUBACK 代替接收。

**實測：** real runtime 收到 `{value:12.5,timestamp:<當下 ISO>}`，matching reviewed power 的 live 已是 12.5 kW，energy accepted rows 仍為 0，而 reader 回 false/null。

```json
{"liveValue":12.5,"liveTimestamp":"2026-09-09T03:12:51.477Z","reception":{"lastAcceptedAt":null,"observed":false},"acceptedEnergyRows":0}
```

**修復方向：** 建立成功提交後的 source-bound power receipt evidence，透過既有 response 讀取；完整隔離 scope/key/meter/channel/revision/epoch，保留 actual receipt time。現有 generic live row 缺少這些來源身分，不能直接當新來源的接收證明。

本次 proposal 明確選擇 current-runtime 有界證據，server restart 後等新有效更新；不新增 durable power history 或 SQLite schema，不把 power 塞入 energy tables，也不更動既有排序規則。跨 restart 接收稽核是另案需求，不暗中加入本修復。

**來源追溯：** reader 由範圍內 `1fd2e6d69` 引入。

[固定版本程式](https://github.com/Yishow/solar_player/blob/abd99ba846c25de35100229452e17e2442552a10/apps/server/src/services/guidedMappingActivationService.ts#L51-L63)

## 驗證證據

### 四項缺陷重現

兩批 inline `node --import tsx --input-type=module -e ...`，working directory `apps/server`，各 2 個 node:test，合計 4/4 缺陷重現成功。第一批用 `src/routes/display-pages-asset-governance.test-support.ts` 初始化／清理 OS temp DB，再讀實際 source impact service；第二批用 `src/mqtt/mqttPowerIngest.test-support.ts` 的 production-runtime helpers，direct case 另註冊 real source route 與 trusted management access。

這四個測試的斷言用來確認「目前錯誤行為確實存在」，不是修復後的 green regressions。正式 regression 的正確預期已列入各 change tasks。測試未寫入 repo 的 product test files、未接真 broker、未碰使用者的正式 data/uploads。

### Focused baseline

以下現有測試 80 pass、0 fail，shared pretest TypeScript build 通過：

```sh
pnpm --filter @solar-display/server test src/services/sourceImpactService.test.ts src/routes/meter-sources.test.ts src/routes/mqtt-guided-activation.test.ts src/mqtt/mqttReviewedPowerOrdering.test.ts src/mqtt/mqttPowerSelectorIngest.test.ts src/services/periodConsumptionService.test.ts src/routes/metrics-history.test.ts
```

### 完整交付 gate

實際執行 `pnpm verify`，讀取完成輸出與各 stage 摘要。全部 stage passed：`build → bundle-budget → shared → server → web → deploy → server-runner`。採當下實際 script 的七個 stage，不沿用較舊 conventions 表格漏列的 shared／bundle-budget。

| Stage | Pass | Fail | Skip |
|---|---:|---:|---:|
| shared | 166 | 0 | 0 |
| server | 1,038 | 0 | 0 |
| web | 1,472 | 0 | 0 |
| deploy | 110 | 0 | 1 |
| server-runner | 14 | 0 | 0 |
| 合計 | 2,800 | 0 | 1 |

略過的是 `real flock releases the monitor slot without leaking it to Firefox`。工具完整暫存 log：`/var/folders/bq/zyknbs7n1xs99c08yprwqc9c0000gn/T/pi-bash-e52f3721d667d0f9.log`；該路徑屬本機暫存，不是 durable repo artifact。沒有真 broker、瀏覽器人工流程、FHD witness 或現場部署驗收，本次也沒有視覺修改。

### Proposal validation

三案分別執行 `openspec validate <change> --strict`，均回 valid。一個早先合併的 status/validate 工具呼叫被執行層阻擋，未當成驗證結果；後續單獨的 strict validation 均已實際成功。規格、設計與任務均已 read-back；不是獨立 fresh-agent review。

## 修復提案與交付範圍

| Findings | Change | 修改的既有 capability |
|---|---|---|
| D1、D2 | `fix-source-impact-scope-and-unknown-handling` | `guided-data-source-onboarding` |
| D3 | `fix-direct-source-runtime-reconciliation` | `meter-reading-contracts` |
| D4 | `fix-reviewed-power-reception-evidence` | `guided-mqtt-tag-mapping` |

每案在 `openspec/changes/<change>/` 下具備 `.openspec.yaml`、`proposal.md`、delta `specs/<capability>/spec.md`、`design.md`、`tasks.md`。按照使用者指定的 openspec-propose 與 repo 的 `spec-driven` schema，先取得 artifact instructions、依序建立並重讀 dependency artifacts。因 workspace bash 不允許建立檔案，scaffold metadata 透過 workspace write 建立，後續以實際 OpenSpec CLI status/instructions/validate 管理；沒有宣稱執行 `openspec new change`。

任務全部未勾選，分別 10、10、11 項。先修 D1/D2 的共同安全決策，再補 D3 接線、D4 證據是建議順序；三案沒有硬性實作依賴。規劃完成不等於產品修復完成，更不等於 change 已 archive。

交付僅新增本報告與上述 15 個 change 檔案；既有 product code、主規格、設定、正式資料與 Git commit 均不變。`git diff --check` 已通過；交付檢查另確認恰有 16 個預期 untracked 新檔、31 項 task 全未勾選、所有檔案有結尾換行且無尾端空白，tracked 與 staged diff 皆為空。後續 apply 必須把本文錯誤行為轉成正式 red→green 回歸，再依當下 workflow 完成 review、驗證與 archive；本次不自行 commit/push。

## Implementation closeout (2026-09-09)

上段為 proposal 階段快照；其「未實作／task 未勾選」狀態已由本節取代。三案已依序實作並保留為 active、uncommitted changes：D1/D2 現在保留 draft scope 並把 unreadable evidence fail closed；D3 在 direct write 提交後以完整 enabled topic set 協調 production runtime；D4 以完整 reviewed source identity 記錄 current-runtime power reception evidence，且只在 live update 成功提交後建立證據。

正式回歸包含 direct 與 guided mutation 的零副作用矩陣、真 route + `MqttClientService` 的訂閱收斂、production power handler 到 identical guided replay、identity/restart/rejection 邊界。Direct、power、source-impact focused suites 分別為 71/71、81/81、59/59 PASS；review 修正後的 power focused suite 另為 18/18 PASS。既有 web suite 為 1472/1472 PASS。

`$code-review` 的最終結果為 Standards PASS、Spec PASS，無剩餘可操作 P0-P3。過程修正兩項 Standards judgment：移除重複的 power source identity alias，以及讓 cumulative-energy ingest result 不再攜帶 power-only identity；先前建議抽取 direct/guided subscription wrapper 經重讀後判定會形成無價值 middle-man，未採納。

最終 `pnpm verify` 所有 stage 通過：build、bundle-budget、shared 166/166、server 1064/1064、web 1472/1472、deploy 110 passed + 1 skipped、server-runner 14/14。三案 `openspec validate <change> --strict` 均為 valid。沒有真 broker、瀏覽器人工流程、部署、production、LAN 或 field acceptance；D4 power evidence 依規格只存在目前 receiving-service lifetime。三案尚未 archive 或 commit。
