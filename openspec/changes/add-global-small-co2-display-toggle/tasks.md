## 1. 設定持久化與管理端入口

- [x] 1.1 依據 `Persist the preference alongside calculation settings` 決策實作 `Calculation coefficients are stored in a settings store with recommended defaults`，讓 `co2AutoConvertSmallToKg` 經由 migration、settings service 與 API 以 `false` 為預設持久化；驗證：`apps/server/src/db/migrations/calculationSettings.test.ts`、`apps/server/src/services/calculationSettingsService.test.ts`、`apps/server/src/routes/calculation-settings.test.ts`
- [x] 1.2 依據 `Operators can view and update calculation coefficients` 實作 `/settings/data-source` checkbox，讓管理端可讀取、切換並儲存 `co2AutoConvertSmallToKg`，且 reload 後仍顯示已保存狀態；驗證：`apps/web/src/pages/DataSourceSettings/viewModel.test.ts` 與受影響的 UI route test

## 2. 共用 CO2 顯示格式

- [x] 2.1 依據 `Apply the conversion at the display formatting layer, not the calculation layer` 實作 `Shared monitoring story can apply a display-only sub-ton CO2 unit preference`，讓原始 CO2 基礎值維持 `t`，但在偏好開啟且 `0 < abs(value) < 1` 時輸出 `kg` 顯示；驗證：新增或更新 `packages/shared/src/displayStory` 相關測試與 `apps/server/src/services/carbonReductionConsistency.test.ts`
- [x] 2.2 依據 `Keep the scope to shared monitoring story consumers` 套用 `Overview` / `Solar` 的共用 story 顯示輸出，確保偏好開關會同步改變這兩頁的 CO2 顯示，而關閉時維持既有 `t`；驗證：`apps/web/src/pages/Overview/viewModel.test.ts`、`apps/web/src/pages/Solar/viewModel.test.ts`

## 3. Spectra 驗證與收尾

- [x] 3.1 完成 change 後重新跑 `spectra analyze add-global-small-co2-display-toggle --json` 與受影響測試，確認 proposal / design / specs / tasks 與實作一致，且無未完成 task；驗證：analyze 結果為無 critical findings，`spectra instructions apply --change "add-global-small-co2-display-toggle" --json` 顯示 `all_done`
