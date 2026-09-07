# Tasks｜資料接入導引、累積電錶設定與安全測試

狀態：實作中；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：E1 / add-meter-reading-contracts、U1 / refactor-data-hub-task-workspace

## 1. Implementation and Verification

- [x] 1.1 **Draft** — 建立可返回task state，MQTT委派M2三階段與direct-edit共用驗證，錯誤/重試不清欄位。（U2-R1）
- [x] 1.2 **Semantics** — 接E1 measurement kind、meter role、unit、cadence與scope欄位，只有一筆顯示等待基準。（U2-R2）
- [x] 1.3 **Numbers** — numeric input保留字串直到validate，空白與0倍數不自動變1。（U2-R2）
- [x] 1.4 **Preview API** — 新增唯讀mapping preview使用正式parser、管理授權及payload大小/遮罩限制。（U2-R3）
- [x] 1.5 **Picker** — 新增支援numeric path的JSON欄位選取，unsupported expression有server error而非假成功。（U2-R3）
- [x] 1.6 **Safety** — 分離連線測試、解析preview、真publish；真publish顯示影響並確認，預設不retained。（U2-R4）
- [x] 1.7 **Persistence** — 單筆source save加入revision conflict；舊全量PUT相容但不可覆蓋他scope資料。（U2-R5）
- [x] 1.8 **Impact** — 刪除或身份變更列出draft/live/derived引用，impact unknown阻擋；managed identity由server拒絕。（U2-R5）
- [x] 1.9 **Handoff** — 保存成功產出safe source identity handoff與waiting-data/baseline狀態，U4接後續目標選取。（U2-R6）
- [x] 1.10 **Security tests** — 測試preview前後DB與MQTT publish count不變，未授權mutation拒絕，URL不含秘密。（U2-R3 U2-R4 U2-R5 U2-R6）
- [x] 1.11 **Verification** — 執行sourceDraft、sourceMappingPreview、settings-mqtt與DataHub相關tests及pnpm verify；驗證熟手可不走wizard。（U2-R1 U2-R2 U2-R3 U2-R4 U2-R5 U2-R6）

## 2. V2 Site-Setup Integration

- [x] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（U2-R7）

- [x] 1.13 **V3 MQTT integration** — 串接受控已接收資料清單/穩定tag來源與原任務，依新增契約驗證，不再要求外部client/手填mapping；此change只實作本層整合。（U2-R8）

## Closeout Notes

- 測試驗證：
  1. `pnpm --filter @solar-display/shared test` (155 測通過，exit code 0)
     - `U2-R4-S01 preview and connection test do not publish`
     - `U2-R4-S02 real publish requires confirmation and defaults retain off`
     - `U2-R5-S02 delete of a referenced source is blocked until resolved`
     - `U2-R5 unknown impact is not treated as zero dependents`
     - `U2-R5 resolved impact allows the mutation`
     - `U2 onboarding keeps the chosen site and walks connection → confirm`
     - `M2 preview is read-only and apply requires the same token and draft`
  2. `pnpm --filter @solar-display/web test` (1440 測通過，exit code 0)
     - `GuidedOnboardingPanel.test.tsx`:
       - `U2 onboarding asks for a site under all-scope`
       - `U2 onboarding keeps KN and starts at connection`
       - `M2 three-stage mapping panel starts at select`
       - `M2 mapping panel does not invent an observation before capture`
       - `M2 mapping preview uses the reviewed source semantics and topic`
       - `U2 connection test is separate from real publish`
  3. `pnpm --filter @solar-display/server test` (925 測通過，exit code 0)
     - `U2-R5-S02 live and draft bindings block deletion until resolved`
     - `E1-R7 production MQTT callback uses M2 extractor then E1 admission`
     - `M2 apply persists selector then tagged MAIN ingest updates only that meter`
     - `guidedMqttMappingService.test.ts` (preview & apply read-only checks)
  4. 交付 Gate：`pnpm verify` 全階段通過（build, bundle-budget, unit tests）。

Archive 與 commit 依 repo workflow 另行執行。

## V3 Dependency Authority

目前前置（取代上方舊版列表）：E1, U1, M1, M2。依本段列出的 change dependency 為準；E1/E6不反向依賴UI以避免循環。

## 2026-09-06 Review follow-up

已完成全部實作與驗收，準備封存。

