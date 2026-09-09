# Source mutation follow-up review — 2026-09-09

## 範圍與判定方式

Repository: `Yishow/solar_player`。

起點包含 `8323c33c12464adf1b5f42670d82d4fe7ae03a7c`；固定終點為本機 HEAD 與 GitHub main 均已確認的 `5f68fa4c574e0176420440a9bfe409da1e727766`。Inclusive range 為 `8323c33c^..5f68fa4c`，起點 parent 為 `13535147ad47613cf80b2321d12cb131b30264ab`。共 61 commits、411 changed paths、41,396 insertions、732 deletions。亦檢查 `8323c33c...HEAD` 為非空 diff。

本次是風險導向 review，不聲稱逐行審完所有 411 個檔案。主查 source lifecycle、guided apply、dependency impact、meter admission、期間計算與 publish/history 交界，並以現有 review 和已合併修復排除重複問題。由同一 reviewer 分開執行 Standards 與 Spec 兩軸；環境未提供可用 reviewer agents，因此不是獨立雙人審查。

依據：根目錄 AGENTS、`docs/ops/conventions.md`、`docs/ops/workflow.md`、`docs/agents/issue-tracker.md`、code-review skill 與 `.agents/skills/openspec-propose/SKILL.md`。規格重點為 `guided-data-source-onboarding` 的 U2-R5、`derived-metric-registry` 的 input scope / siteScopes 契約，以及 `guided-mqtt-tag-mapping` 的原子 apply、M2-R15、destructive mutation 與 runtime activation 契約。

## Standards Review

在本次已檢查區域，未確認新的獨立硬性程式規範違反。不將 TypeScript/格式可自動驗證事項重報為人工 finding，也不以檔案較長本身當作缺陷。兩個已重現問題屬行為及規格符合度，列在下軸；此結論不代表整個 repository 無維護性風險。

**本軸：0 findings；最高嚴重度：無。**

## Spec Review

### R1 — [P2] Derived input 忽略有效 scope，誤擋另一廠區來源

位置：`apps/server/src/services/sourceImpactService.ts:144–146`。現有查詢只用 `metric_key`，沒有處理 `scope_selector` 或 owning definition 的 `site_scopes_json`。Registry 實際已區分 explicit scope 與 output-site（`derivedMetricRegistryService.ts:197–202,532–535`）；schema 也保存這些欄位。

在隔離 DB 先建立 CL、KN 的同名 raw mappings，確認 CL impact 原本可修改，再透過正式 `saveDerivedMetricDefinition` 保存合法 `custom.reviewKnOnlyPower`。兩種可保存配置均重現：explicit `kn`；`output-site` 加 `siteScopes: ["kn"]`。兩者都讓 CL impact 變成 `canMutate:false`、`unknown:false`，唯一 consumer 是這個 KN-only derived definition；共用 destructive guard 拒絕 CL 停用並回 `E1_SOURCE_IN_USE`。KN 仍阻擋的正向斷言亦通過。

影響：管理者需要停用或改名 CL 來源時，會被不依賴它的 KN 公式卡住。這不是先前已修的 draft-scope bug；問題在獨立的 derived 分支。`git blame` 顯示查詢來自範圍內的 `8768480c5`。

修復方向：依有效 input scope 篩選，不可只加 `scope_selector = requestedScope` 而漏掉 output-site。保留必要 scope evidence 無法解讀時 fail-closed、same-scope blocking 及兩種寫入路徑的 commit-time guard。計畫：`fix-derived-source-impact-scoping`。

### R2 — [P2] Guided destination rename 未退役舊 mapping，runtime 留下舊訂閱

位置：`apps/server/src/services/guidedMqttMappingService.ts:98,157–160`。Apply 保存新 source revision 後，只同步 saved/new destination；沒有向 mapping synchronization 傳遞 persisted previous destination。舊 source 已 disabled，舊 mapping 卻仍 enabled。

隔離 service test 以正式 preview/apply 將 `reviewOldPower` / `review/rename/0` 改為同 channel 的 revision 2、`reviewNewPower` / `review/rename/1`。結果 source revisions 的 enabled 為 `[0,1]`，兩個 mapping 卻都是 `1`。第二個 runtime test 使用真正的 `MqttClientService`、`activateGuidedMapping` 與 FakeMqttClient：先啟用舊 topic、再 rename/activate，activation 回 active，但 active-topic 集合同時保留無其他 owner 的舊 topic 和新 topic。

影響：已放棄的接收設定仍列入 desired subscription set，訂閱狀態無法隨 rename 正確收斂。重要界線：舊 mapping 的封包在 `mqttMeterIngest.ts:263–266` 回 `SOURCE_NOT_ACTIVE`；本次未發現或宣稱 accepted readings 污染。相關 apply/synchronization 路徑由範圍內 `804ad2bf6`、`bf1031856` 演進而來。

修復方向：同 transaction 原子退役只由該來源放棄的 old scoped mapping，保護已由其他 active source 接手的 key，再由既有 subscription owner 協調完整集合；不能直接 unsubscribe 共用 topic。計畫：`fix-guided-source-rename-retirement`。

**本軸：2 findings；最高嚴重度：P2。**

## 重現證據與界線

四個測試以 `node --import tsx --input-type=module -e` 在 `apps/server` 執行；未新增或修改產品 test files。使用既有 `display-pages-asset-governance.test-support.ts` 的 temp DB、migration/seed 及 cleanup hooks。Runtime case 使用 `mqttPowerIngest.test-support.ts` 的 FakeMqttClient，不連正式 broker。

| Case | 實際執行的斷言 | 結果 |
| --- | --- | --- |
| R1 explicit KN | CL 原本可改；保存 KN-only 公式後 CL 被拒，KN 仍被保護 | 重現 PASS |
| R1 output-site + KN allowlist | CL 被列為 derived consumer，guard 拒絕 CL 停用 | 重現 PASS |
| R2 committed mapping | 舊 source disabled，但舊 mapping enabled，舊封包 SOURCE_NOT_ACTIVE | 重現 PASS |
| R2 real runtime / fake broker | Rename activation active，新舊 topic 同時保留 | 重現 PASS |

這四個 PASS 是本報告初始 review 階段的 baseline，刻意斷言當時錯誤行為，以證明 finding 可重現；不是修復驗收。最初 R1 fixture 使用非 `custom.*` 名稱，被 registry validation 拒絕；修正為合法 namespace 後才得到上述兩個重現結果。初次 fixture rejection 沒有算作產品 finding。R1 與 R2 後續皆已完成 red→green 實作與本機驗證，分別見下方 final implementation evidence。

R1 的精簡輸出（兩個 selector 的結果相同）：

```json
{
  "cl": {
    "canMutate": false,
    "consumers": [{ "kind": "derived", "metricKey": "custom.reviewKnOnlyPower" }],
    "unknown": false,
    "registeredExpectations": []
  },
  "kn": {
    "canMutate": false,
    "consumers": [{ "kind": "derived", "metricKey": "custom.reviewKnOnlyPower" }],
    "unknown": false,
    "registeredExpectations": []
  }
}
```

R2 runtime 輸出：

```json
{
  "activation": {
    "reason": null,
    "retryable": false,
    "state": "active",
    "topic": "review/runtime/new"
  },
  "oldTopicStillActive": true,
  "newTopicActive": true
}
```

本段只記錄初始 baseline 重現；後續 R2 final evidence 已補足 failure injection、scope/owner 保護、retirement replay、same/shared/managed topic 與 broker failure/disconnection 路徑。

## R1 final implementation evidence — `fix-derived-source-impact-scoping`

R1 已依 change 契約實作完成到 closeout 前最後一項文件更新。Derived impact 現在以 metric key 加 effective input scope 判定：explicit `cl` / `kn` / `global` 僅匹配自身；`output-site` 依 owning definition 的有效 `siteScopes` 展開，省略時維持 CL+KN；`all` 保留所有有效 scope。Matching input 若缺 owner、selector 不支援，或 `output-site` 所需 siteScopes evidence 無法驗證，維持 unknown / fail-closed 並保留原始 evidence。Direct 與 guided destructive mutation 共用同一 guard，commit-time recheck 與 committed replay 語意不變。未新增 schema、UI、正式資料 migration/backfill，也未改公式 evaluator 或 response shape。

Final focused evidence：

| Suite | Result |
| --- | ---: |
| `sourceImpactService.test.ts` | 14/14 PASS, 0 skip |
| `source-impact-mutation.test.ts` | 16/16 PASS, 0 skip |
| `guidedMqttMappingService.test.ts` | 26/26 PASS, 0 skip |
| `derivedMetricRegistryService.test.ts` | 49/49 PASS, 0 skip |
| related shared package tests | 167/167 PASS, 0 skip |

Final root `pnpm verify` 亦為 exit 0，build、bundle-budget、shared、server、web、deploy、server-runner 全部通過；其中 server 1081/1081、web 1472/1472、deploy 110 PASS / 1 platform SKIP、server-runner 14/14。Deploy 的唯一 SKIP 仍是 `real flock releases the monitor slot without leaking it to Firefox`，不計為 PASS。

Closeout evidence：`openspec validate fix-derived-source-impact-scoping --strict` PASS；`git diff --check` PASS。Standards review 對 change-1 scoped final source/test diff 為 0 個新 finding。Spec review 確認 R1 的 effective-scope、fail-closed、direct/guided guard、commit-time recheck 與 replay 契約均有實作及 regression evidence；未觀察到 schema/UI/正式資料變更。

上述全是本機 repository / test evidence，不等同 production、實際 runtime、broker/MQTT、部署、FHD 或人工 acceptance。本輪未 commit、未 push。R2 的最終證據見下一節。

## R2 final implementation evidence — `fix-guided-source-rename-retirement`

R2 已依 change 契約完成實作與本機 closeout。`applyGuidedMapping` 在既有 transaction 內只從 persisted previous source 取得 previous metric key，並將同一份 previous source 同時用於 destructive guard 與 mapping synchronization；request 沒有新增 client 自報 old-key 欄位。`syncSourceTopicMapping` 只在同 scope 舊 key 沒有任何 active source owner 時停用舊 mapping，保留 CL/KN 隔離、後來接手的 active owner、source lineage、measurement history、audit 與 receipt。Receipt replay branch 不重做 retirement，因此 rename 後舊 key 被重新分配再 replay 時不會覆寫 later owner。

Runtime 端沒有新增 rename-specific unsubscribe。`activateGuidedMapping` 仍以 `listEnabledGenericTopics(database)` 讀取目前 committed enabled mappings，再交由既有 `MqttClientService` 與 managed owners 協調完整 desired set。Sole-owner 舊 topic 會在成功 reconciliation 後移除；same-topic rename 不做多餘 unsubscribe；另一 enabled mapping 或 managed owner 仍需要舊 topic 時會保留。Broker refusal 不回滾已提交 SQL rename，回報 failed/retryable；disconnected runtime 回 pending/retryable，後續 retry/reconnect 依 current committed ownership 收斂。Subscription ACK 仍不被當作 reception evidence。

Final focused command：

```sh
pnpm --filter @solar-display/server test \
  src/services/guidedMqttMappingService.test.ts \
  src/routes/source-impact-mutation.test.ts \
  src/services/meterSourceCatalogService.test.ts \
  src/routes/meter-sources.test.ts \
  src/routes/mqtt-guided-activation.test.ts \
  src/mqtt/MqttClientService.test.ts
```

結果：104 tests、104 pass、0 fail、0 skip。覆蓋 guided rename retirement、CL/KN scope、active later owner、各 persistence write boundary rollback、committed replay 零新增寫入、direct caller ownership 保護，以及真 `MqttClientService` + FakeMqttClient 的 sole-owner/same-topic/shared mapping/managed owner、broker refusal、disconnection、retry/reconnect 收斂。

Final root `pnpm verify` 為 exit 0；build、bundle-budget、shared、server、web、deploy、server-runner 全部 stage passed，server 1095/1095、web 1484/1484、deploy 110 PASS / 1 SKIP、server-runner 14/14。Deploy 唯一 SKIP 為 `real flock releases the monitor slot without leaking it to Firefox`，是本機平台相關 skip，不記成 PASS。

Closeout evidence：`openspec validate fix-guided-source-rename-retirement --strict` PASS；R2 scoped staged 與 worktree `git diff --check` 皆 PASS。Standards review 對 final production/test/change diff 為 0 個新 finding：production 只修改 guided apply 與 source/mapping synchronization，SQL 以參數綁定並限定 scope，沒有 migration、歷史批次 cleanup、正式 broker 操作、新 public API/config 或 rename service 直接 unsubscribe。Spec review 將兩個 ADDED requirements 與 scenarios 逐一對回上述 implementation/tests，未發現未覆蓋的契約缺口；先前 `spectra analyze` 的 COV-1/COV-2、CON-1..CON-5 都是 lexical/cross-artifact Warning，沒有 Critical，並已由 persisted previous-source authority、atomic rollback/replay、scoped owner protection 與 runtime owner convergence 的實碼與回歸證據人工確認。

上述 runtime evidence 使用本機真 `MqttClientService` 搭配 FakeMqttClient / synthetic broker，證明 reconciliation 邏輯但不等同 production broker、實際部署、FHD 或人工 acceptance。本輪沒有操作正式 broker、沒有 migration/backfill、沒有 commit、push 或 archive。

## 既有測試與 OpenSpec 驗證

Focused command：

```sh
pnpm --filter @solar-display/server test \
  src/services/sourceImpactService.test.ts \
  src/routes/source-impact-mutation.test.ts \
  src/services/guidedMqttMappingService.test.ts \
  src/services/derivedMetricRegistryService.test.ts
```

結果：88 tests、88 pass、0 fail、0 skip。這些是既有測試通過，並未覆蓋本次全部新情境。

`pnpm verify` 在未更改產品程式碼的 baseline 實際執行；build、bundle-budget、shared、server、web、deploy、server-runner 全部通過：

| Test stage | Pass | Fail | Skip |
| --- | ---: | ---: | ---: |
| shared | 166 | 0 | 0 |
| server | 1064 | 0 | 0 |
| web | 1472 | 0 | 0 |
| deploy | 110 | 0 | 1 |
| server-runner | 14 | 0 | 0 |
| Total | 2826 | 0 | 1 |

跳過項目：`real flock releases the monitor slot without leaking it to Firefox`。這是本機平台相關測試的 SKIP，不記為 PASS。執行紀錄：`/var/folders/bq/zyknbs7n1xs99c08yprwqc9c0000gn/T/pi-bash-9db91469a69c5fe7.log`；此為可被 OS 清理的暫存 log，本報告保留 stage summary。

以下兩個命令皆回 valid：

```sh
openspec validate fix-derived-source-impact-scoping --strict
openspec validate fix-guided-source-rename-retirement --strict
```

兩個 `openspec status --change <name> --json` 在初始 planning snapshot 均確認 repo-local、default schema `spec-driven`、proposal/specs/design/tasks 全部 done、`isPlanningComplete:true`。當時 tasks 分別 0/9、0/10，共 19 項全部未勾選；這是實作前基線，不是目前進度。R1 的 final implementation evidence 見上節；R2 在該證據截點仍未開始實作。

## 交付與工具限制

初始 review 階段新增兩個 `openspec/changes/` change，各含 `.openspec.yaml`、proposal.md、design.md、tasks.md 及一份對應既有 capability 的 delta spec；另新增本報告。該階段僅規劃文件、不變更 main specs 或產品 source/tests；其後 R1、R2 均已進入實作，最終證據與邊界如上節。

環境沒有 RTK、rg、graphify CLI，改以原始 git/grep、現行 source、schema 與測試核查；不宣稱使用了更新的知識圖譜。Workspace 規則要求檔案透過 write/edit 寫入，因此未使用會建立檔案的 `openspec new change`，而依讀到的 project default 建立 metadata，再由 CLI 核對 artifact paths、dependencies、instructions、validation 與最終 status。第二個 change 的 proposal/tasks instructions 命令被執行層阻擋，這兩份沿用第一個 change 成功讀取的相同 spec-driven 模板，並從磁碟重讀其自身依賴；其 specs/design instructions、strict validation 與最終 status 均成功。不將被阻擋的命令記作已執行成功。

初始 review 截點尚未實作或 archive，也未 commit/push、未修改正式 DB 或連接正式 broker；沒有執行 UI/FHD 人工驗收。後續 R1、R2 均已完成本機實作與驗證，但仍未 archive/commit/push，且上述 production/runtime/broker/deployment/FHD/human acceptance 界線不變。這些證據不是 release approval。
