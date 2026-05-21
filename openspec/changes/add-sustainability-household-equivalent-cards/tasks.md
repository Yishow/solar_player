## 1. 建立 household-equivalent 衍生資料契約

- [x] 1.1 落實 `Derive electricity-bill equivalence from self-consumption-based savings` 與 `Derive household-equivalent cards from measured self-consumption`，讓 server/shared helper 以 daily summary 的 `self_consumption_total` 與 cumulative `selfConsumption` 推導 today/cumulative 卡片 headline；驗證方式為 `apps/server/src/services/sustainabilityStoryService.test.ts`、新增 household equivalence tests 與 `spectra validate --strict --changes add-sustainability-household-equivalent-cards`。
- [x] 1.2 落實 `Fail closed when the equivalence basis is unavailable` 與 `Surface unavailable state when the equivalence basis is missing`，讓缺少 self-consumption basis 或 calc profile 時 household-equivalent 卡會回傳 unavailable state 而不是退回 generation；驗證方式為 route/service fallback tests 與 API content review。

## 2. 讓估算口徑成為正式 metadata

- [x] 2.1 落實 `Carry calculation assumptions as first-class household-equivalent metadata` 與 `Keep household-equivalent assumptions visible to the operator-facing page`，讓 calc profile、disclaimer、basis source、sync state 會隨 household-equivalent 卡一起輸出並可供 Sustainability 顯示；驗證方式為 `apps/server/src/routes/sustainability-story.test.ts`、`apps/web/src/pages/Sustainability/viewModel.test.ts` 與 spec content review。
- [x] 2.2 落實 `Keep data provenance as first-class presentation data in Sustainability`，讓 household-equivalent 卡即使 estimate metadata 不完整也能安全降級顯示，不會讓前台崩潰；驗證方式為 `apps/web/src/pages/Sustainability/viewModel.test.ts` 與 render fallback assertions。

## 3. 交付 Sustainability 預設兩張 4 口之家卡

- [x] 3.1 落實 `Seed Sustainability with two default household-equivalent cards while keeping currency secondary`，讓 Sustainability 預設配置帶出 `今日綠電效益` 與 `累積綠能成果` 兩張卡，headline 以 `X 戶4口之家` 為主而非金額；驗證方式為 page seed/config tests、`apps/web/src/pages/Sustainability/configRender.test.ts` 與 view model snapshot review。
- [x] 3.2 完成 household-equivalent end-to-end regression 驗證，確認 `Derive household-equivalent cards from measured self-consumption`、`Keep household-equivalent assumptions visible to the operator-facing page` 與 `Surface unavailable state when the equivalence basis is missing` 都能在 web/server 測試與 Spectra analyzer 下成立；驗證方式為 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test`、必要 build/test 命令與 `spectra validate --strict --changes add-sustainability-household-equivalent-cards`。
