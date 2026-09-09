## 1. 固定基準與失敗回歸

- [x] 1.1 開始 apply 時重新比對 GitHub main、local HEAD 與工作目錄，確認 F1 仍存在；將實際 head 與變更範圍記入本案驗證紀錄，不覆蓋他人工作。
- [x] 1.2 在 guided service 與 management apply route tests 加入「已知草稿引用的 enabled source 被停用」案例；先證明目前不能滿足 HTTP 409／保持 enabled 的 assertions，使用 temporary database，不連正式 broker。
- [x] 1.3 加入原 metricKey 被 live page／derived metric 使用時改名、preview 後新增引用、impact lookup unknown 的負向案例；以 source/mapping/audit/receipt/page/profile 快照及 runtime spy 驗證拒絕零寫入、零 subscription reconciliation。

## 2. 最小修復與保護回歸

- [x] 2.1 收斂直接来源路由與 guided 首次 apply 的 destructive-transition guard，於交易內用 persisted previous source 的 scope/key 重查 impact；驗證 1.2、1.3 由紅轉綠且直接 PUT/DELETE 既有行為未變。
- [x] 2.2 補新建、重新啟用、改名稱及無使用者停用的正向案例，驗證不被新 guard 誤擋且 source/mapping enabled 一致。
- [x] 2.3 回歸相同 receipt replay、不同 request 的 idempotency conflict、stale/expired token、managed ownership 與跨站不變資料；驗證只有 first mutation 執行新 guard，既有安全檢查未被跳過。
- [x] 2.4 驗證 apply 的既有 failure envelope 與 409 codes，並跑 malformed preview 422／owner preview 409 測試，確認沒有把 dependency code 加入 ownership conflict 分類。

## 3. 整合驗證與交接

- [x] 3.1 執行 `pnpm --filter @solar-display/server test src/services/guidedMqttMappingService.test.ts src/services/sourceImpactService.test.ts src/services/meterSourceCatalogService.test.ts src/routes/meter-sources.test.ts src/routes/mqtt-guided-activation.test.ts src/routes/site-energy-profiles.test.ts`；將實際指令、pass/fail 數與任何額外新增 targets 寫入本案驗證紀錄。
- [x] 3.2 完成 Standards／Spec review 並修正本案 findings，執行當下 `pnpm verify` 與 `openspec validate fix-guided-source-mutation-guards --strict`，保存實際輸出；未完成或受阻的驗證保持未勾選。
- [x] 3.3 用 `git diff`、`git status` 核對僅有本案最小程式、測試及文件；記錄是否仍需人工驗收與精準交付範圍，依 repo workflow 再進入 archive／另行確認 commit，不自動提交。
