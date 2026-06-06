## 1. Boundary Preflight

- [x] 1.1 讀取 `capture-fhd-reference-informed-playback-witness-classifications` 產出的 boundary classification artifact，交付 `Tune only classified Overview and Solar reference quality targets` 的 Overview/Solar `reference-quality-target` row 清單；完成後以 `rg "/overview|/solar|reference-quality-target|protected-product-choice|actual-gap" docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md` 驗證分類輸入存在。
- [x] 1.2 確認 Overview/Solar 的 header/footer rows 仍為 `protected-product-choice`，交付 `Preserve Shell Boundaries` 的 shell 不動邊界；完成後以內容審查確認本 change 不修改 shared shell files、header/footer height、footer position 或 shell density。

## 2. Overview Reference Quality Targets

- [x] 2.1 為 Overview hero media fade、雙語 title/eyebrow/lead rhythm、KPI row spacing/card hierarchy 補上或調整 focused tests，交付 `Keep Overview closeout editor-maintainable` 的 RED/updated coverage；完成後以 `pnpm --filter @solar-display/web test -- src/pages/Overview/configRender.test.tsx src/pages/displayPageSeeds.test.ts` 驗證。
- [x] 2.2 只透過 `apps/web/src/pages/Overview/displayPageConfig.ts` 與既有 seed/config path 調整 Overview visual values，交付 `Tune Existing Editor-Backed Values Only` 的 reference-quality-target tuning；完成後以內容審查確認沒有 page-local runtime hardcode、沒有新增 editor schema、沒有修改 shared shell CSS。
- [x] 2.3 若 fresh witness 顯示 Overview media quality 需要現有 controls 以外的能力，將該項記錄為 `actual-gap` follow-up，交付 `Actual Gaps Become Follow-Up Work` 的 handoff；完成後以 `rg "actual-gap|Overview" docs/reference-match/overview-solar-reference-quality-closeout.md` 驗證。

## 3. Solar Reference Quality Targets

- [x] 3.1 為 Solar connector/node treatment、flow placement、KPI row rhythm 補上或調整 focused tests，交付 `Keep Solar closeout editor-maintainable` 的 RED/updated coverage；完成後以 `pnpm --filter @solar-display/web test -- src/pages/Solar/configRender.test.ts src/pages/Solar/layout.test.ts src/pages/displayPageSeeds.test.ts` 驗證。
- [x] 3.2 只透過 `apps/web/src/pages/Solar/displayPageConfig.ts` 與既有 seed/config path 調整 Solar visual values，交付 `Tune Existing Editor-Backed Values Only` 的 source-like flow quality tuning；完成後以內容審查確認 connector/node treatment 仍由 resolved display config 表達。
- [x] 3.3 若 fresh witness 顯示 Solar connector stroke、cap 或 node treatment 無法由現有 fields 表達，將該項記錄為 `actual-gap` follow-up，交付 `Actual Gaps Become Follow-Up Work` 的 separate editor capability handoff；完成後以 `rg "actual-gap|Solar" docs/reference-match/overview-solar-reference-quality-closeout.md` 驗證。

## 4. Evidence And Gates

- [x] 4.1 建立 `docs/reference-match/overview-solar-reference-quality-closeout.md`，交付 before/after witness notes、protected shell confirmation、actual-gap notes；完成後以 `rg "Overview|Solar|protected-product-choice|reference-quality-target|actual-gap" docs/reference-match/overview-solar-reference-quality-closeout.md` 驗證。
- [x] 4.2 更新 `docs/fhd-witness/playback-closeout-matrix.md` 與 `docs/reference-match/display-launch-witness-matrix.md`，交付 `Preserve launch status until full gates pass` 的 Overview/Solar visual closeout result 與 launch blocked rationale；完成後以內容審查確認 visual improvement 與 launch readiness 未混為同一件事。
- [x] 4.3 跑 focused web tests，確認 Overview/Solar config render、layout、seed coverage 通過；完成後以 `pnpm --filter @solar-display/web test -- src/pages/Overview/configRender.test.tsx src/pages/Solar/configRender.test.ts src/pages/Solar/layout.test.ts src/pages/displayPageSeeds.test.ts` 驗證。
- [x] 4.4 跑 Spectra gates，確認 requirements、design、tasks 一致；完成後以 `spectra analyze polish-overview-solar-reference-quality-targets --json` 無 Critical/Warning 且 `spectra validate polish-overview-solar-reference-quality-targets --strict` 通過驗證。
