## 1. Scope and layout contract

- [x] 1.1 完成 “Align only the remaining partial reference pages in this change” 並對應 ### Reuse the existing reference page migration pattern instead of inventing a new page host，為 `/factory-circuit`、`/sustainability`、`/offline` 建立 page-local layout constants、route-local CSS 與必要 asset mapping；驗證方式為 route code review 與 layout tests，確認 major region geometry 不散落在 JSX literal，且沒有重新引入新的 page host。
- [x] 1.2 完成 “Migrate Factory Circuit and Sustainability onto the shared playback reference body model” 的 display contract foundation，並對應 ### Centralize display-facing icon and asset keys in view models and layout modules，讓 `buildFactoryCircuitViewModel()`、`buildSustainabilityViewModel()` 若需要新增 display-facing fields 時仍保留既有 fallback 邊界；驗證方式為執行 `pnpm --filter @solar-display/web exec tsx --test src/pages/FactoryCircuit/viewModel.test.ts src/pages/Sustainability/viewModel.test.ts`。

## 2. Factory Circuit and Sustainability migration

- [x] 2.1 完成 “Migrate Factory Circuit and Sustainability onto the shared playback reference body model” 在 `/factory-circuit` 的遷移，讓 route 呈現 reference-like title group、flow diagram、load panel 與 KPI band，且不再依賴 `PageScaffold` title block 作為主體；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工比對 `03-factory-circuit.html` 的 major composition。
- [x] 2.2 完成 `/factory-circuit` 的 fallback 與 threshold display preservation，讓 circuits API 空資料或失敗時仍保留 diagram/load/KPI 骨架與 empty state；驗證方式為 `src/pages/FactoryCircuit/viewModel.test.ts` 與 code review。
- [x] 2.3 完成 “Migrate Factory Circuit and Sustainability onto the shared playback reference body model” 在 `/sustainability` 的遷移，讓 route 呈現 reference-like storytelling title group、hero media、compact KPI row、stat cards 與 highlight row，且不再依賴 `PageScaffold` title block 作為主體；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工比對 `05-sustainability.html` 的 major composition。
- [x] 2.4 完成 `/sustainability` 的 asset/fallback preservation，讓 summary 或資產缺失時仍保留 readable KPI/stat placeholders 與既有文案；驗證方式為 `src/pages/Sustainability/viewModel.test.ts` 與 code review。

## 3. Offline surface and closeout

- [x] 3.1 完成 “Preserve Offline reconnect and retry behavior while aligning the error surface”，並對應 ### Treat Offline as a playback-style error surface while preserving reconnect contract，讓 `/offline` 呈現 reference-like centered error panel、media background、detail rows 與 retry bar，同時保留 reconnect countdown、manual retry、returnTo 與 auto-return；驗證方式為執行 `pnpm --filter @solar-display/web exec tsx --test src/pages/OfflineError/viewModel.test.ts` 與 `pnpm --filter @solar-display/web build`。
- [x] 3.2 完成 `/offline` 的 placeholder preservation，讓缺 timestamp 或 unknown reason 時仍顯示既有 placeholder copy；驗證方式為 `src/pages/OfflineError/viewModel.test.ts` 與 code review。
- [x] 3.3 完成 narrow-scope closeout，更新 `docs/reference-match/all-pages-audit.md` 與 `docs/reference-match/all-pages-checklist.md` 反映三頁新狀態，並執行 `spectra analyze align-reference-remaining-factory-sustainability-offline-pages --json` 與 `pnpm --filter @solar-display/web build` 作為驗證。
