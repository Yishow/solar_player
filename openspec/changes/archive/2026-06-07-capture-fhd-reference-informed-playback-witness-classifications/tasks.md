## 1. Witness Capture Inputs

- [x] 1.1 確認 `docs/fhd-witness/playback-closeout-matrix.md` 的五頁 route/reference/editor preview mapping 仍正確，交付 `Capture a five-page reference-informed witness batch before tuning` 的輸入清單；完成後以 `rg "/overview|/solar|/factory-circuit|/images|/sustainability" docs/fhd-witness/playback-closeout-matrix.md` 驗證五頁存在。
- [x] 1.2 執行或阻塞記錄 FHD witness command，交付 `Capture Before Tuning` 的每頁 playback/editor witness path 或 capture blocker；完成後以 `pnpm run fhd:witness -- --base-url http://localhost:5173 --run-id reference-informed-closeout` 的結果、或明確 blocker note 驗證。

## 2. Boundary Classification Artifact

- [x] 2.1 建立 `docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md`，交付 `Classify each material reference mismatch in one boundary table`、`Store five-page boundary classification inside the evidence workflow`、`Boundary Table Is The Handoff Contract` 的五頁 table；完成後以 `rg "protected-product-choice|reference-quality-target|actual-gap|Accepted By|Revisit Trigger" docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md` 驗證三分類與必要欄位。
- [x] 2.2 在 classification artifact 中明確列出 header/footer protected shell attributes 與 page content targets，交付 shell/page 分離 contract；完成後以內容審查確認 `protected-product-choice` rows 不含 hero、KPI、flow、circuit、media stage、caption、ornament、highlight rail。
- [x] 2.3 將 classification artifact 的 follow-up 欄位對應到後續四個 page closeout changes，交付 downstream handoff；完成後以 `rg "polish-overview-solar-reference-quality-targets|polish-factory-circuit-reference-quality-targets|polish-images-reference-quality-targets|polish-sustainability-reference-quality-targets" docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md` 驗證。

## 3. Matrix And Tests

- [x] 3.1 更新 `docs/reference-match/display-launch-witness-matrix.md`，交付 `Preserve launch blocked status until launch gates pass`、`Consume boundary classification as launch rationale without changing gate semantics`、`Launch Matrix Remains Blocked Unless Gates Pass`；完成後以內容審查確認五頁 Overall 仍為 `blocked`，且 boundary rationale 只解釋 status。
- [x] 3.2 更新 `apps/web/src/pages/fhdEvidenceWorkflow.test.ts` 與 `apps/web/src/pages/displayLaunchWitnessGates.test.ts`，交付 classification artifact 與 matrix blocked-status contract；完成後以 `pnpm --filter @solar-display/web test -- src/pages/fhdEvidenceWorkflow.test.ts src/pages/displayLaunchWitnessGates.test.ts` 驗證。
- [x] 3.3 跑 Spectra gates，確認 artifact 與 implementation contract 一致；完成後以 `spectra analyze capture-fhd-reference-informed-playback-witness-classifications --json` 無 Critical/Warning 且 `spectra validate capture-fhd-reference-informed-playback-witness-classifications --strict` 通過驗證。
