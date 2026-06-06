## 1. Boundary Preflight

- [x] 1.1 讀取 `capture-fhd-reference-informed-playback-witness-classifications` 產出的 boundary classification artifact，交付 `Tune only classified Sustainability reference quality targets` 的 Sustainability `reference-quality-target` row 清單；完成後以 `rg "/sustainability|Sustainability|reference-quality-target|protected-product-choice|actual-gap" docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md` 驗證分類輸入存在。
- [x] 1.2 確認 Sustainability 的 header/footer rows 仍為 `protected-product-choice`，交付 shell 不動邊界；完成後以內容審查確認本 change 不修改 shared shell files、header/footer height、footer position 或 shell density。

## 2. Sustainability Tests And Tuning

- [x] 2.1 為 ring ornament / hero media overlap、Trees/stat card rhythm、highlight rail density、supporting copy hierarchy 補上或調整 focused tests，交付 `Keep Sustainability As Story Playback`、`Preserve Sustainability story playback hierarchy` 與 `Keep Sustainability closeout editor-maintainable` 的 RED/updated coverage；完成後以 `pnpm --filter @solar-display/web test -- src/pages/Sustainability/configRender.test.ts src/pages/Sustainability/layout.test.ts src/pages/Sustainability/viewModel.test.ts src/pages/displayPageSeeds.test.ts` 驗證。
- [x] 2.2 只透過 `apps/web/src/pages/Sustainability/displayPageConfig.ts`、既有 seed/config path、以及既有 config consumer 調整 Sustainability visual values，交付 `Tune Existing Editor-Backed Values Only` 的 story/stat quality tuning；完成後以內容審查確認沒有新增 editor schema、沒有 sustainability API/runtime data model change、沒有 shared shell CSS change。
- [x] 2.3 確認 `sustainability.css` 或 `index.tsx` 若有修改，只是消費 existing resolved config values，交付 editor-maintainable renderer path；完成後以內容審查確認沒有寫死 reference-only page-local constants。
- [x] 2.4 若 fresh witness 顯示 ring ornament overlap、hero media treatment 或 highlight rail density 無法由現有 fields 表達，將該項記錄為 `actual-gap` follow-up，交付 `Actual Gaps Become Follow-Up Work`；完成後以 `rg "actual-gap|Sustainability|ring|hero|highlight" docs/reference-match/sustainability-reference-quality-closeout.md` 驗證。

## 3. Evidence And Gates

- [x] 3.1 建立 `docs/reference-match/sustainability-reference-quality-closeout.md`，交付 before/after witness notes、protected shell confirmation、actual-gap notes；完成後以 `rg "Sustainability|protected-product-choice|reference-quality-target|actual-gap" docs/reference-match/sustainability-reference-quality-closeout.md` 驗證。
- [x] 3.2 更新 `docs/fhd-witness/playback-closeout-matrix.md` 與 `docs/reference-match/display-launch-witness-matrix.md`，交付 `Preserve launch status until full gates pass` 的 Sustainability visual closeout result 與 launch blocked rationale；完成後以內容審查確認 visual improvement 與 launch readiness 未混為同一件事。
- [x] 3.3 跑 focused web tests，確認 Sustainability config render、layout、view-model、seed coverage 通過；完成後以 `pnpm --filter @solar-display/web test -- src/pages/Sustainability/configRender.test.ts src/pages/Sustainability/layout.test.ts src/pages/Sustainability/viewModel.test.ts src/pages/displayPageSeeds.test.ts` 驗證。
- [x] 3.4 跑 `graphify update .`，交付 graphify AST refresh；完成後以命令結束碼 0 驗證。
- [x] 3.5 跑 Spectra gates，確認 requirements、design、tasks 一致；完成後以 `spectra analyze polish-sustainability-reference-quality-targets --json` 無 Critical/Warning 且 `spectra validate polish-sustainability-reference-quality-targets --strict` 通過驗證。
