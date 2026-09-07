# Tasks｜用同期間真實電量計算部門用電百分比

狀態：實作中；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：E1 / add-meter-reading-contracts、E2 / fix-period-consumption-deltas、E3 / repair-consumption-history-projections、E6 / add-site-energy-accounting-profiles

## 1. Implementation and Verification
- [x] 1.1 **Tests** — 加入250/150/100→50/30/20以及固定slot percentages不可沿用的red tests。（E5-R1）
- [x] 1.2 **Model** — 新增basis/period/denominator/membership與nullable ratio共享型別，保留livePowerKw獨立欄位。（E5-R1 E5-R6）
- [x] 1.3 **Configuration** — 接E6主錶/部門錶清冊及非重疊驗證；兩部門同錶、同一加總集合父子重複要指出衝突，合法父分母/子分子不拒絕。（E5-R4）
- [x] 1.4 **Calculation** — 實作同site/window的E2 delta分子與site-main/department-sum分母，禁止無聲切換。（E5-R1 E5-R2）
- [x] 1.5 **Quality** — 完成0分子、0分母、缺成員與stale資料分支，不對部分成員重新正規化。（E5-R3 E5-R7）
- [x] 1.6 **Reconciliation** — 實作未分攤量、缺回報標記與子錶>主錶的一致性警告，不以clamp隱藏。（E5-R5）
- [x] 1.7 **Story** — 將server結果接displayStoryService，site/period/revision進快取鍵，未設定channel要有diagnostic。（E5-R1 E5-R7）
- [x] 1.8 **Rendering** — 移除兩條viewModel path固定sharePercent，nullable顯示—、真0顯示0%，ratedCapacity只保留利用率語意。（E5-R1 E5-R3 E5-R7）
- [x] 1.9 **Editor** — 將day/month/year與profile/department參照加入page config；分母選擇只在E6/U6共用設定，inspector提供入口而非第二套欄位，測試兩類變更的實際影響。（E5-R2 E5-R6）
- [x] 1.10 **Presentation** — 隱藏卡片不改membership；1位小數保留自然舍入差，輸出分母與期間提示。（E5-R4 E5-R7）
- [x] 1.11 **Verification** — 跑departmentEnergyShareService、FactoryCircuit viewModel/config與display-story integration tests，再pnpm verify。（E5-R1 E5-R2 E5-R3 E5-R4 E5-R5 E5-R6 E5-R7）
- [x] 1.12 **Acceptance** — 以CL/KN各一份明確mapping測試零值、缺錶及period切換，完成fresh FHD witness和使用者分母/視覺acceptance。（E5-R2 E5-R3 E5-R6 E5-R7）

## 2. V2 Site-Setup Integration

- [x] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（E5-R8）

## Closeout Notes

- 測試驗證：
  1. `pnpm --filter @solar-display/shared test` (155 測通過，exit code 0)
     - `E5-R1 250/150/100 against site-main 500 becomes 50/30/20`
     - `E5-R2 missing site-main baseline does not switch to department sum`
     - `E5-R3 zero total stays unavailable rather than NaN percentages`
     - `E5-R4 duplicate department membership is rejected`
  2. `pnpm --filter @solar-display/server test` (925 測通過，exit code 0)
     - `energyAuthoringJourney.test.ts` (resolvePersistedDepartmentShares 50/30/20 驗證)
     - `metrics-history.ts` API 驗證
  3. 交付 Gate：`pnpm verify` 全階段通過。

Archive 與 commit 依 repo workflow 另行執行。

## 2026-09-06 Review follow-up

已完成全部實作與驗收，準備封存。

