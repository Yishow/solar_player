# Energy authoring follow-up code review — 2026-09-08

## Review baseline and scope

Repository: `Yishow/solar_player`, branch: `main`.

Inclusive starting commit: `8323c33c12464adf1b5f42670d82d4fe7ae03a7c`.
Diff base: `13535147ad47613cf80b2321d12cb131b30264ab` (the starting commit's parent).
Reviewed head: `98979b6f46b124a7b568167e42cc9a261024fa18`.
Range: `8323c33c12464adf1b5f42670d82d4fe7ae03a7c^...98979b6f46b124a7b568167e42cc9a261024fa18`.

GitHub main、local HEAD 與 origin/main 在開始及收尾核對時一致。範圍有 51 個提交；apps/packages 差異為 181 個檔案、+18,645 / -548。範圍盤點涵蓋上述 diff，深入追查集中在來源接入、profile/effective period、發布 readiness，以及歷史資料進入正式 API／畫面的路徑；不是對全部功能逐行正確性的保證。

上一份 `2026-09-08-energy-authoring-review.md` 的 R1–R10 已有後續三批修復。本報告不把那些舊 findings 原封不動重開，改以最新 main 追查仍可重現的缺口。使用 repo 的現行規格與 conventions/workflow/judgment；本環境未提供可用的 review subagent，因此兩個審查軸由同一 reviewer 分別執行，沒有聲稱完成獨立雙人或平行審查。

本輪只新增本報告與兩個 OpenSpec change 的規劃文件，沒有修改產品程式、正式資料、MQTT 設定或部署，也沒有 commit、push、PR 或 archive。

## Standards

### S1 — P2 judgment: possible duplicated mapping-state responsibility

位置：`apps/server/src/services/guidedMqttMappingService.ts:64–85`、`apps/server/src/services/meterSourceCatalogService.ts:358–370`。

Guided selector 保存與既有 `syncSourceTopicMapping` 都處理 mapping 更新，但只有後者同步來源的 enabled 狀態。這是可能的 Duplicated Code／責任重複判斷，不冒稱 repo 有一條明文要求必須使用某個 helper，也不列編排、命名或 lint 類瑣事。N2 已證明兩條路徑的行為分歧；修復時應收斂最小的 enabled 同步責任，不能藉此整理整個來源服務。

這個維護性觀察與 N2 是同一根因，不另算第五個獨立功能缺陷。此軸沒有另列明文規範違反；最高為 P2 judgment。

## Spec

### N1 — P1: Guided MQTT mapping can acquire a reserved Solar destination

定位：`apps/server/src/services/guidedMqttMappingService.ts:47–61,123–126`。

既有規格 `openspec/specs/guided-mqtt-tag-mapping/spec.md` 的 M2-R11 要求每次 preview/apply 檢查受管身分；既有 legacy route `apps/server/src/routes/settings-mqtt.ts:704–721` 也會拒絕 derived／Solar ownership 衝突。但 guided service 驗證 source、selector、token 與 meter_sources 內部衝突後，直接保存來源和 mapping，沒有套用同一條 ownership 保護。

**已實測：** 隔離資料庫中，以 `cl:factoryGeneration.totalKw` 為目的的 power-gauge draft，先確認現行 `isSolarAdapterManagedMetricIdentity` 回 true；HTTP preview 回 200，同一 token 的 service apply 回 applied=true，保存 enabled=1 的 generic topic mapping。

```text
REPRO_MANAGED {"guardSaysManaged":true,"previewStatus":200,"applied":true,"mapping":{"metric_key":"factoryGeneration.totalKw","topic":"review/isolated/managed","enabled":1}}
```

影響是受管來源名稱可被一般接入流程取得，可能形成彼此競爭的數值寫入者。這裡證明的是接受與保存衝突 mapping，不是宣稱正式 broker 已發生污染。修復必須在 preview 及 apply 都查權威 owner，apply 防止 preview 後變更，拒絕前後零配置寫入且不啟用 runtime。保留身分的 disabled derived metric 也必須受保護，不能比 legacy route 更寬鬆。

對應 change：`fix-guided-mqtt-write-integrity`。

### N3 — P1: Management daily history bypasses the canonical consumption overlay

定位：`apps/server/src/routes/metrics-history.ts:64–70`；消費端：`apps/web/src/pages/EnergyHistory/viewModel.ts:271–278,362–367`。

`consumption-history-projections` 的 E3-R1、E3-R4、E3-R9 要求使用一致的期間／每日用電與明確缺口。管理端 `readEnergyHistory` 僅把 periodSummary 接到新 resolver，summaries 仍直接回傳 raw `consumption_total`；同檔播放端 daily-summary 已做 canonical overlay。`DailySummaryService` 又已對 CL／KN 原始 daily summary consumption 寫 null，故這條管理路徑會遇到舊資料錯值或新資料空值。

**已實測：** KN 同一來源在 2026-09-01、09-02 的午夜讀值為 1000、1300；asOf 固定為 09-02 午夜（Asia/Taipei）。Sep 1 的 legacy summary 故意放 consumption=9999、generation=10。管理端月總量回 300，但日資料回 9999；paired KN display 的同日資料回 canonical 300、quality=exact，兩邊 generation 均保留 10。

```text
management.periodSummary.valueKwh = "300"
management.summaries[2026-09-01].consumptionTotal = 9999
pairedDisplay.summaries[2026-09-01].consumptionTotal = 300
pairedDisplay.summaries[2026-09-01].quality = "exact"
```

EnergyHistory 的月曲線及表格直接使用 summaries，因此總量卡片與每日資料會互相矛盾。API 數值已重現；本輪未宣稱跑過瀏覽器畫面。修復應共用讀取時的日用電 overlay、保留 route 權限與 range 的日期集合，不回填 raw summaries，更不能把每天缺口補成零來湊整月。

對應 change：`fix-energy-history-range-projections`。

### N2 — P2: Guided re-enable leaves the topic mapping disabled

定位：`apps/server/src/services/guidedMqttMappingService.ts:75–85`。

Guided apply 能把來源存成 enabled=true，但既有 mapping 的 UPDATE 只改 topic、unit、value_path、selector，沒有改 enabled；INSERT 則把 enabled 固定成 1。既有來源修改路徑已有 `syncSourceTopicMapping` 同步 source/mapping，guided 路徑卻沒有使用一致狀態。

**已實測：** 先 guided apply 一個 custom KN source，再用既有 source save + sync 路徑停用兩者，最後 guided apply 重新啟用同一 source/revision/topic/selector。

```text
REPRO_REENABLE {"sourceEnabled":1,"mappingEnabled":0}
```

這違背 `guided-mqtt-tag-mapping` 的原子保存及可觀察啟用契約：來源看似已啟用，mapping 仍不符合 production 的 enabled 篩選（`MqttClientService.ts:272`）。本輪證明資料庫狀態錯位；正式封包回收與 shared topic 情境列為修復回歸，不冒稱已驗過。

修復要以 saved source 同步 mapping 的 enabled，讓新增、停用、重新啟用保持一致；保持同一交易、原有 revision／selector、receipt 及其他 topic owner。

對應 change：`fix-guided-mqtt-write-integrity`。

### N4 — P2: Total history is silently reduced to the current year

定位：`apps/server/src/services/periodConsumptionService.ts:54–69`。

`periodSelectionFromRange` 明確把 `year` 與 `total` 都變成當年的 year selection。對已設定 profile 的站點，原本 total 查詢的全範圍語意遂被年度期間取代；這與 E3-R1、E3-R9 的範圍保存要求及畫面的「累積」選項不一致。

**已實測：** profile 的已知起點為 2025-01-01，同一 continuous source 在該日為 1000、2026-01-01 為 1600、2026-09-02 為 1900。HTTP year/total 都回 300 和相同的本年起點，而完整已知跨年區間差值是 900。

```text
REPRO_TOTAL {"yearValue":"300","totalValue":"300","totalStart":"2025-12-31T16:00:00.000Z","continuousRegisterDeltaSince2025":900}
```

同 helper 的 week 會回 null，後續 `tryResolvePersistedPeriodConsumption` 與消費端因而保留 legacy fallback 的風險；這是原始碼追蹤證據，不是已完成的 week 數值端到端重現，不另算第五項。

修復需保留 requested span，total 起點必須有明確 accounting evidence；不能證明就回 partial/unavailable，不假裝已知設備終身起點。Week 維持今天及前六日而非新增日曆週產品。有 profile 但無法計算，不能與無 profile 混成相同 fallback，亦不能把 null 相加變成假零。

對應 change：`fix-energy-history-range-projections`。

## Verification evidence

### Existing tests actually executed

下列第一組 21/21 通過，第二組 53/53 通過，共 74 個既有後端測試。兩次 pretest 的 shared TypeScript build 都通過。

```sh
pnpm --filter @solar-display/server test \
  src/routes/energy-authoring-consumers.test.ts \
  src/routes/metrics-history.test.ts \
  src/routes/mqtt-guided-activation.test.ts \
  src/routes/site-energy-readiness-publishing.test.ts

pnpm --filter @solar-display/server test \
  src/services/guidedMqttMappingService.test.ts \
  src/services/meterSourceCatalogService.test.ts \
  src/routes/settings-mqtt.test.ts
```

指令實際透過 `rtk proxy` 執行，PATH 包含本機 Node v24.15.0 與 Homebrew。測試綠燈只代表既有 assertions 通過，不代表這四個新發現已修好。尤其目前 Q1 測到管理端 periodSummary，沒有檢查同一回應中的 daily consumption sentinel。

### Isolated reproduction history

使用 `node --import tsx --input-type=module -e` 的 inline tests，從 `apps/server` 引入既有 `display-pages-asset-governance.test-support.ts`，由它建立、遷移、seed 並回收 temporary database。沒有把 reproduction 寫成產品或正式測試檔，也未連 production broker。

第一批四個 reproduction 中，N2 與 N4 成功重現；其餘兩個測試最初存在 fixture 錯誤：Solar 測試誤用非受管的 `generationPower`，以及 week 的 SQL 真實日期與 Node mock Date 不同造成取不到預期 row。這兩次 fixture 失敗沒有算成產品 defect 證據。修正為真實受管 prefix 與只核對實際命中的 month/day 後，N1、N3 第二批 2/2 重現成功。四個主 findings 均有成功的獨立 reproduction；week 分支仍只列 code-trace 證據。

### Planning validation and limits

最終版本實際執行：

```sh
openspec validate fix-guided-mqtt-write-integrity --strict
openspec validate fix-energy-history-range-projections --strict
openspec status --change fix-guided-mqtt-write-integrity
openspec status --change fix-energy-history-range-projections
```

兩個 validate 都回 valid；兩份 change 均顯示 `4/4 artifacts complete`，指的是 proposal/specs/design/tasks 文件齊備，不代表 implementation 完成。各 tasks 的實作 checkbox 均維持未勾選。

嘗試補跑 EnergyHistory／EnergyTrend viewModel tests 的一組指令被工具攔下，未執行，故不列 pass 或 test failure。之後只有文件的只讀 validate/status 另行成功。`pnpm verify`、完整 web tests、瀏覽器/FHD witness、正式 MQTT 及現場人工驗收本輪均未執行。上述限制已列入後續 apply 的驗證工作。

## Repair proposals and checkpoint

`openspec/changes/fix-guided-mqtt-write-integrity/` 處理 N1、N2；`openspec/changes/fix-energy-history-range-projections/` 處理 N3、N4。兩者各有 `.openspec.yaml`、`proposal.md`、一份沿用既有 capability 路徑的 delta spec、`design.md`、`tasks.md`。兩份可各自實作，優先建議先堵住 MQTT 寫入的受管名稱缺口；沒有硬性互相依賴。

最後 `git status --short --untracked-files=all` 確認只有本 review 與兩個 planning directories，共 11 個新增檔案；tracked 與 staged diff 均為空。兩份 tasks 分別有 9 與 11 個未勾選項目，產品程式維持 main 基準。後續實作必須重新核對 main，先加入能證明缺陷的回歸，再修改程式，不可以把本報告的 reproduction 成功當成修復成功。

## Pinned sources

- [Guided mapping source](https://github.com/Yishow/solar_player/blob/98979b6f46b124a7b568167e42cc9a261024fa18/apps/server/src/services/guidedMqttMappingService.ts)
- [Source lifecycle and mapping synchronization](https://github.com/Yishow/solar_player/blob/98979b6f46b124a7b568167e42cc9a261024fa18/apps/server/src/services/meterSourceCatalogService.ts)
- [Management and display history routes](https://github.com/Yishow/solar_player/blob/98979b6f46b124a7b568167e42cc9a261024fa18/apps/server/src/routes/metrics-history.ts)
- [Period range mapping](https://github.com/Yishow/solar_player/blob/98979b6f46b124a7b568167e42cc9a261024fa18/apps/server/src/services/periodConsumptionService.ts)
- [Existing guided mapping contract](https://github.com/Yishow/solar_player/blob/98979b6f46b124a7b568167e42cc9a261024fa18/openspec/specs/guided-mqtt-tag-mapping/spec.md)
- [Existing history projection contract](https://github.com/Yishow/solar_player/blob/98979b6f46b124a7b568167e42cc9a261024fa18/openspec/specs/consumption-history-projections/spec.md)

Standards: 0 hard violations, 1 judgment (highest P2). Spec: 4 findings (2 P1, 2 P2; highest P1). S1 and N2 share one root cause and are not counted twice as independent functional defects.
