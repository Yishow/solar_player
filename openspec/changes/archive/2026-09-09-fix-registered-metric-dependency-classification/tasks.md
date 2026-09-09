## 1. 固定基準與失敗回歸

- [x] 1.1 開始 apply 時比對 GitHub main、local HEAD 與工作目錄，確認 `fix-guided-source-mutation-guards` 的共用 guard 已在樹上、且結構性期望仍造成恆真阻擋；驗證方式為對一個只有 registered 期望的目的地實跑停用並記錄實際回應碼，寫入本案驗證紀錄，不覆蓋他人工作。
- [x] 1.2 [P] 在 `apps/server/src/services/sourceImpactService.test.ts` 加入案例：目的地只有 registered story／readiness 期望時，來源影響讀取應回 `canMutate` 為 true 且在結構性期望集合列出該期望；先證明目前回 false，斷言以實際回傳物件為準。
- [x] 1.3 [P] 在 `apps/server/src/services/guidedMqttMappingService.test.ts` 與 `apps/server/src/routes/meter-sources.test.ts` 加入案例：只有 registered 期望的目的地，導引式套用與直接來源路由的停用及 metricKey 變更應成功且來源與 mapping 啟用狀態一致；先證明兩者目前皆回 HTTP 409 `E1_SOURCE_IN_USE`，使用 temporary database，不連正式 broker。

## 2. 分類收斂與保護回歸

- [x] 2.1 依 design 的「以既有 consumer 類型區分阻擋集合，不新增分類來源」，讓來源影響服務只把 draft 綁定、metric usage 中類型為 widget 的列與 derived metric 輸入納入阻擋集合；驗證 1.2、1.3 由紅轉綠，且不修改 metric usage 服務本身的列產生邏輯。
- [x] 2.2 依 design 的「結構性期望以獨立欄位揭露，不混入阻擋集合」，讓來源影響回傳與 `/api/data-hub/source-impact` 以獨立陣列欄位揭露 story／readiness 期望，成員帶 metric key、consumer 類型與頁面識別，無期望時回空陣列；以 `apps/server/src/routes/site-energy-profiles.test.ts` 的端點回應斷言驗證既有 `canMutate`、`unknown`、`consumers` 三個欄位名稱與型別未變。
- [x] 2.3 依 design 的「破壞性轉換的判斷位置與錯誤契約不變」，回歸共用 guard 的觸發條件、交易內位置與兩個錯誤碼；驗證 `fix-guided-source-mutation-guards` 既有的 `M2-R16` 案例除必要的 fixture 目的地調整外全部維持通過，零寫入與零 subscription reconciliation 斷言不放寬。
- [x] 2.4 補齊 Source mutations preserve identity ownership and concurrent work 的阻擋回歸：draft 綁定、published live 頁面 widget 綁定、derived metric 輸入三種各自使兩入口回 HTTP 409 `E1_SOURCE_IN_USE`，影響查詢失敗回 `E1_SOURCE_IMPACT_UNKNOWN`；以 source、mapping、audit、receipt 快照驗證拒絕零寫入。

## 3. 整合驗證與交接

- [x] 3.1 執行 `pnpm --filter @solar-display/server test src/services/sourceImpactService.test.ts src/services/guidedMqttMappingService.test.ts src/services/meterSourceCatalogService.test.ts src/routes/meter-sources.test.ts src/routes/mqtt-guided-activation.test.ts src/routes/site-energy-profiles.test.ts`；將實際指令、pass/fail 數與任何額外新增 targets 寫入本案驗證紀錄。
- [x] 3.2 完成 Standards／Spec review 並修正本案 findings，執行當下 `pnpm verify` 與 `openspec validate fix-registered-metric-dependency-classification --strict`，保存實際輸出；未完成或受阻的驗證保持未勾選。
- [x] 3.3 用 `git diff`、`git status` 核對僅有本案最小程式、測試及文件，確認未動前端與 metric usage 列產生邏輯；記錄是否仍需人工驗收與精準交付範圍，依 repo workflow 再進入 archive／另行確認 commit，不自動提交。
