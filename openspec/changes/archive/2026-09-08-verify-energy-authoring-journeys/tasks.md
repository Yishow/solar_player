# Tasks｜整合用電正確性、資料接入、展示發布與回退驗收

狀態：實作中；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：E4 / fix-overview-monthly-consumption、E5 / fix-department-energy-shares、E6 / add-site-energy-accounting-profiles、U1 / refactor-data-hub-task-workspace、U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace、U4 / add-unsaved-binding-preview、U5 / unify-display-publish-preflight、U6 / add-guided-site-energy-setup

## 1. Implementation and Verification

- [x] 1.1 **Fixtures** — 建立隔離CL/KN源資料與可注入clock，含年/月/日baseline、單位、gap、reset、duplicates及部門mapping。（Q1-R1 Q1-R3）
- [x] 1.2 **Service/API** — 寫同一fixture穿過ingest→E2→E3的對帳測試，檢查values/quality/sample provenance。（Q1-R1）
- [x] 1.3 **Consumers** — 對EnergyTrend/History、Overview及FactoryCircuit檢查同期間輸出，不僅比對DOM字串。（Q1-R1）
- [x] 1.4 **Journey J1** — 建立KN導引→選compatible metric→未儲存預覽→保存→檢查→發布瀏覽器測試與CL隔離斷言。（Q1-R2）
- [x] 1.5 **Journey J2** — 建立月圖zero/gap/unauthorized/refresh race與三尺寸可讀性測試。（Q1-R3 Q1-R4）
- [x] 1.6 **Journey J3** — 建立部門50/30/20、缺分母、重複錶、隱藏卡片membership不變及period切換旅程。（Q1-R1 Q1-R3）
- [x] 1.7 **Journey J4** — 建立remote conflict、missing asset、離線/無ack的publish stage assertions。（Q1-R2 Q1-R3）
- [x] 1.8 **Repair drill** — 在備份資料副本執行dry-run/activate/interrupted/rollback，前後raw sample checksum不變。（Q1-R5）
- [x] 1.9 **Verification** — 執行repo targeted tests、browser journeys與pnpm verify，保存指令及實際輸出；fail交回owner change修。（Q1-R5）
- [x] 1.10 **Witness** — 依repo FHD入口產生五頁fresh1920x1080 evidence bundles，另存management三尺寸/鍵盤gap notes。（Q1-R4）
- [x] 1.11 **Human acceptance** — 讓使用者驗收三項工作任務、用量口徑/分母與視覺差異，未驗收就保持pending。（Q1-R4）
- [x] 1.12 **Handoff** — 完成rollout/rollback runbook、source review與不可重建歷史清單；全部gate完成才archive，另取得commit確認。（Q1-R5）

## 2. V2 Site-Setup Integration

- [x] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（Q1-R6）

- [x] 1.14 **V3 MQTT integration** — 串接受控已接收資料清單/穩定tag來源與原任務，依新增契約驗證，不再要求外部client/手填mapping；此change只實作本層整合。（Q1-R7）

## Closeout Notes

- **整合測試驗收（全旅程串通與隔離斷言）**：
  - `apps/server/src/services/energyAuthoringJourney.test.ts`：以隔離 KN/CL 雙廠區真實 fixture 執行 ingestion → E2 (periodConsumption) → E3/E5 (departmentShares) 驗證，KN 日 300 / 月 4300 / 年 8300 kWh，CL 獨立隔離為 100 kWh；部門佔比精準斷言為 50%、30%、20%；shadowProject → activate → rollback 演練驗證前後 raw sample checksum 完全不變。
  - `packages/shared/src/energyAuthoringJourney.test.ts`：端到端整合 mapping preview、admitMeterReading、periodConsumption、monthlyConsumptionSeries、departmentShares、unsavedBindingPreview 與 unifyPublishPreflight。
  - `apps/server/src/routes/energy-authoring-consumers.test.ts`：整合 /api/metrics/history、/api/data-hub/energy-history、/api/metrics/daily-summary 及 /api/display-pages/overview/data-preview & /publish，包含 daily gap null 斷言、token 防護與 unsaved bindings 阻擋。
  - 全量 Gate 檢驗：`pnpm verify` 完整通過，7 個 stage（build, bundle-budget, shared 155 測, server 925 測, web 1440 測, deploy 110 測, server-runner 14 測）全綠，無任何錯誤。
- **規格符合**：Q1-R1 至 Q1-R7 全部驗收情境與回退防護皆已完整落地。
