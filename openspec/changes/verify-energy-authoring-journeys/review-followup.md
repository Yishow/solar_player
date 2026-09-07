# 2026-09-06 Energy authoring review follow-up

Review 起點為 `bb74dca94fcc86fe7e69d3f6703283d123b1456e`。本次修復接續當前 `8768480c`；不覆寫其間已提交的修正。範圍是可重現缺陷修復與 15 個 change 的實作盤點，不是一次完成所有功能。Q1 只保存整合證據，功能責任仍歸各 owner change。

## 本輪修復

| Owner | 修復及回歸證據 |
| --- | --- |
| E1 / M2 | `mqttMeterIngest.ts` 在 JSON 轉成 JS number 前保留 decimal lexeme。測試涵蓋小數及超過 safe integer 的 counter，accepted reading 保存原值。 |
| E2 / E5 | SQLite loader 保留 meter/source revision/epoch；期間內負差、未證明連續性的換錶、單筆資料、過期邊界不再產生 exact 用量；拒絕 invalid asOf，以 instant 排序。shared 反例與 SQLite loader 測試覆蓋。完整 rollover、interval-energy、provenance 仍待實作。 |
| M1 | Capture 依 connectionRef 與 filter 隔離；到期或停用後不可查；淘汰 sampleRef 時釋放 evidence；read/write API 加管理授權，拒絕隱含 CL scope。`.env.example` 記錄預設關閉的 flag。未實作站點 principal、主動 discovery 與全域資源預算。 |
| M2 | Preview 綁完整 source/topic/selector 與目標快照；apply 在 immediate transaction 重查，source、mapping、receipt 原子提交；同 key 重試回原結果，變更 payload 回 conflict。migration 044 保存 receipt/target snapshot。沒有真實觀測時 UI 不再填入 MAIN 假資料。 |
| E6 | Preview snapshot 持久化且有 TTL，scope/expectedRevision 不可替換；停用舊 profile、寫新 revision 與 receipt 在同一 transaction。migration 045；注入 insert failure 證明舊 active profile 保留，同 key 可重試。M2/E6 共用 canonical JSON，欄位順序變動不會誤判衝突。 |
| U5 | Publish 所需站點來自群組配置、desired playlist 與設備仍套用的舊 playlist，複製頁以 template 分類，不再由 pageId 猜 CL/KN；確認 UI 在未完成檢查、dirty 或發布中不可操作。仍缺完整 structural dependency fingerprint 與 server publish idempotency。 |
| E5 | Runtime 初始／錯誤／空列不再顯示 seed 占比，缺分母顯示空值而非假 0 或 25%。SSR regression 已改以真實缺資料契約驗證。 |
| U6 / U3 | 廠區設定預覽與確認套用拆開、跨站與 draft 變更使舊 preview 失效；移除 region tree 已孤立的發布／儲存 props。最終 diff 與 web tests 驗證。 |

## 尚未實作或僅部分實作

以下是程式接線缺口，不能用 tasks 勾選、型別、純 helper 或 fixture 代替產品完成。15 個 change 中共 100 個尚未滿足完整契約的已勾選 tasks 已重開；其餘勾選也不代表整個 change 已驗收。

| Change | 尚缺行為 | 可回讀的程式證據 |
| --- | --- | --- |
| E1 `add-meter-reading-contracts` | selector/timestamp path/version metadata 尚未閉環；retained/invalid/late admission 與舊 live/freshness 寫入尚未統一；receive-time estimate 不可冒充 source time。 | `mqttMeterIngest.ts` 的 timestamp extraction；`MqttClientService.ts` generic live upsert 早於 E1 admission；`meterReadingService.ts` timestamp quality。 |
| E2 `fix-period-consumption-deltas` | interval-energy 專用加總、reset/replacement/rollover 事件、observedDelta、邊界偏移/sample provenance、daily coverage；DailySummaryService 正式寫入尚未接 E6 calendar/resolver。 | `periodConsumption.ts` 目前只有 counter difference；`DailySummaryService.ts` 仍讀 accumulator 並 clamp 舊 counter delta。 |
| E3 `repair-consumption-history-projections` | canonical period identity、period/asOf/profile revision 查詢、production rebuild/invalidation、完整 dry-run/activate/rollback 與 catalog。現有 scope+range projection 可能被錯用到另一個月份。 | migration 042 沒有 period key/start/end；`readActiveProjection` 只按 scope/range；`tryResolvePersistedPeriodConsumption` 優先讀該 projection；shadow/activate production caller 未接。 |
| E4 `fix-overview-monthly-consumption` | 真正 playback 的月圖載入、管理 preview context、site+period refresh key、error/stale 顯示與三尺寸驗收。 | `Overview/runtimeContent.tsx` 用 allowUnscopedMetrics 控制月圖 enabled；`PhasePowerTableWidget.tsx` 無管理 context，沒有呈現 lifecycle error/stale。 |
| E5 `fix-department-energy-shares` | period 切換、分母名稱、coverage/freshness 說明、monitoring-history refresh；未完成完整卡片/多錶整合驗收。 | `FactoryCircuit/runtimeContent.tsx` 只 mount fetch 固定 month；`departmentSharesService.ts` response 不含 period/denominator label。 |
| E6 `add-site-energy-accounting-profiles` | source kind/unit/flow/topology 驗證、可用與待資料狀態、calculator 真實數值預覽、impact、effective-dated history、profile-following/custom consumer、歷史封存與回退。 | `validateSiteEnergyProfile` 僅基礎結構檢查；route 沒注入 calculator；`siteEnergyProfileService.ts` 只有 active/revision 儲存，無 closed-history resolver。 |
| M1 `add-mqtt-observation-catalog` | unique client 的受控訂閱與逐 filter SUBACK、sample 讀取/stream、tag grouping、offline paste/import、全域 session/memory/rate budgets、principal-site 授權與 rollout 清理。 | `MqttDiscoveryService.ts` 只產生物件；capture service 只接 production tap，sample map 只有 evidence；capture route 沒 sample/offline endpoint；managementAccess 沒 site claim。 |
| M2 `add-guided-mqtt-tag-mapping` | 真實 catalog 選取、多選批次 canonical、語意/單位/CT-PT 確認、實際 engine preview、reserved/physical ownership、profile atomic apply、runtime subscription reconcile、drift 及 legacy selector 保護。 | Panel 呼叫端仍未提供 observation/source/topic；selectedTags 未進入 apply；server preview 只保存 canonical，沒有 extraction result；apply 僅 source+mapping。 |
| U5 `unify-display-publish-preflight` | dirty→save→review、全部頁面的 server guard、asset/source/profile structural dependency fingerprint、actionable findings/fallback policy、shared impact、server idempotency、page/version matching ack。 | publishing service token 只綁 page/version/TTL，guard 仍限 energy templates；asset missing 多為 warning；drawer 沒 diff/impact/remediation 或 device ack。 |
| U6 `add-guided-site-energy-setup` | meter picker 完整語意/最近值、任意部門編輯、named-meter-set、真實結果/分母/影響 review、inline M1/M2 onboarding、dirty/conflict recovery、操作員無手冊驗收。 | `SiteEnergySetupPanel.tsx` 仍固定三部門；GET meters 為基本來源清單；E6 calculator/impact 未接。 |
| Q1 `verify-energy-authoring-journeys` | 同 fixture 的完整 provenance 對帳、J1–J4 真實 browser journeys、repair drill、fresh FHD bundle、三尺寸/鍵盤 witness、人工 acceptance 與 rollout/rollback runbook。 | `energyAuthoringJourney.test.ts` / `energy-authoring-consumers.test.ts` 是服務與注入 API 測試；`tests/browser/critical-journeys.spec.ts` 尚非完整能源任務旅程。 |
| U1 `refactor-data-hub-task-workspace` | source workspace 尚未接 M1 實際 observations 與 M2 add-from-received-data。 | `SourcesModel.ts` 只載入既有 topics/Solar sources；`Sources.tsx` 仍提供技術表單。假 sample 已在本輪移除，實際 catalog 接線仍缺。重開 1.12。 |
| U2 `add-guided-data-source-onboarding` | preview 未使用正式 ingestion extraction/normalization，也未回 normalized value；MQTT 實際 observation 輸入未接。 | `guidedMqttMappingService.ts` preview 保存 canonical/token；panel 僅遍歷傳入 payload。重開 1.4、1.5、1.13。 |
| U3 `refactor-display-editor-workspace` | U6 handoff 未保留 scope/page/item/draft selection。 | `sourceConnectionPanel.tsx` 使用普通 href 前往 DataHub energy，沒有 draft handoff。重開 2.1。 |
| U4 `add-unsaved-binding-preview` | 缺 client edit revision、catalog revision、draft fingerprint 的 request/response 契約與整合驗證。 | `displayDataPreviewService.ts` parser 只允許 context/stage/unsavedRegions；client API 與回應型別沒有上述版本欄位。重開 1.1、1.11，1.12 仍未完成。 |

## 接續順序與完成邊界

1. E1 admission/freshness/metadata → E2 期間與 DailySummary → E3 period identity/projection；先確保數值與歷史可對帳。
2. M1 真實 capture → M2 有證據的來源配對 → E6 validation/preview/history → U6 四步設定；再補完整管理旅程。
3. E4/E5 scoped consumers + U1–U4 作者流程 → U5 dependency guards/impact/ack → Q1 browser、修復演練與 FHD/人工驗收。

不得把本輪測試通過當作 broker、正式資料修復、Pi 部署、FHD 或人工驗收。未 archive、未 commit、未 merge。

## 驗證與 checkpoint

- **PASS** `rtk pnpm verify`，exit 0；build、bundle-budget、shared、server、web、deploy、server-runner 七階段全部通過。shared 133、server 873、web 1,438 項全部通過、無 skip。最後一輪包含 canonical JSON 修復。
- deploy 110 PASS / 1 SKIP（`real flock releases the monitor slot without leaking it to Firefox`）；server-runner 14 PASS。不把該平台條件跳過的檢查算成已驗證。
- **PASS** `rtk git diff --check`；親代理回讀 source/diff，並整合 Luna 唯讀審查命中的 canonical JSON 問題。
- **PASS** 對本次 15 個 change 逐一執行 `rtk spectra validate <absolute-change-path> --json`，全部 exit 0。
- Q1 `spectra analyze`：13 個 Warning、0 Critical，屬 requirement/design 名稱與 task 的文字對應提示；不代表 runtime/spec 已完整。
- 回歸重點：source/topic token mutation zero-write、mapping SQL failure rollback、同 key lost-response retry、profile 跨站 token/欄位順序/insert failure、period reset/epoch/single/boundary、capture broker/filter/expiry/auth、KN-only publish、U6 獨立確認與切站。
- **NOT RUN** 隔離真實 broker discovery、完整 J1–J4 browser、正式資料 repair drill、fresh FHD/三尺寸 witness、Pi 部署與人工 acceptance。這些仍是未完成的功能／交付項目。
- 原始輸出：[verify.log](../../../.scratch/energy-authoring-review-20260906/verify.log)、[spec-validation.json](../../../.scratch/energy-authoring-review-20260906/spec-validation.json)。
- Checkpoint：HEAD 仍為 `8768480c5f2b866656e88f0cf31c0dcf9b264b2d`；修復留在工作樹。可復原 patch 與 hash manifest 保存於 `.scratch/energy-authoring-review-20260906/`，未 stage、commit、archive 或 merge。
