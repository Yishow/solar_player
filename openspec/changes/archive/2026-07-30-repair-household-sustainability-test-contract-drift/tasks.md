## 1. 契約與 fixture 修復

- [x] 1.1 依「Treat shipped Taiwan defaults as canonical」決策落實 requirement「Calculation coefficients are stored in a settings store with recommended defaults」，使 spec、migration 026、settings service 與 recommended-default tests 一致使用 0.467／0.16／13／400／4.5；驗證：`spectra analyze repair-household-sustainability-test-contract-drift --json` 無 Critical/Warning，並執行 `pnpm --filter @solar-display/server test src/db/migrations/calculationSettings.test.ts src/services/calculationSettingsService.test.ts src/routes/calculation-settings.test.ts`。
- [x] 1.2 依「Repair fixtures before changing runtime」決策修復 `householdEquivalenceService.test.ts` 的 6 個 baseline failures，使每個案例明確設定 coefficient、Default Profile factory scope 與完整/缺失 factory summary，並維持 active-scope、freshness 與 fail-closed 行為；驗證：`pnpm --filter @solar-display/server test src/services/householdEquivalenceService.test.ts` 全部通過。
- [x] 1.3 依「Repair fixtures before changing runtime」與「Keep provenance assertions semantic and explicit」決策修復 `display-card-data.test.ts`、`sustainability-story.test.ts`、`sustainabilityStoryService.test.ts` 的 7 個 baseline failures，使數字、source、sourceClass、derived status 與 missing-topic/formula-input-missing 分類由明確 fixture 決定；驗證：`pnpm --filter @solar-display/server test src/routes/display-card-data.test.ts src/routes/sustainability-story.test.ts src/services/sustainabilityStoryService.test.ts` 全部通過。

## 2. Gate 與回歸邊界

- [x] 2.1 確認修復未改 API shape、SQLite schema、MQTT topic、Playback Profile 或前端行為，且原 13 個失敗全部轉綠；驗證：focused 四檔測試、`pnpm test`、`pnpm build`、`pnpm verify` 與 `git diff --check` 全部通過，並 review diff 只包含本 change 的 spec/test 或有明確 failing-test 證據的最小 source fix。
