## 1. Playback hooks order guard

- [x] 1.1 交付 `Staged loading preserves playback hook order` 與 `Centralize playback hook-order guard in one cross-page contract test`：新增跨五個 playback runtime page 的單一 hooks order guard，違規時能指出 page key；verify: `node --import tsx --test src/pages/displayRuntimeHookOrder.test.ts`。
- [x] 1.2 收斂 Solar / Sustainability 的 page-local hooks order source checks，讓跨頁 guard 成為主要防線且既有 config render tests 仍維持頁面 config contract；verify: `node --import tsx --test src/pages/Solar/configRender.test.ts src/pages/Sustainability/configRender.test.ts src/pages/displayRuntimeHookOrder.test.ts`。

## 2. Preview request-window stability guard

- [x] 2.1 交付 `Preview request windows remain stable under order churn` 與 `Keep preview request-window stability as a pure helper contract`：擴充 `resolvePreviewCatalogRequestKey` 行為測試，證明重排與重複 page keys 產生同一 identity，新增或移除 page key 產生不同 identity；verify: `node --import tsx --test src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts`。

## 3. Review and verification

- [x] 3.1 完成本 change 的 artifact/code review 與完整 gate，確認沒有 runtime 行為、socket protocol、chunk splitting drift；verify: `spectra analyze harden-performance-regression-guards --json`, `spectra validate harden-performance-regression-guards`, `git diff --check`, `pnpm --filter @solar-display/web build`, `pnpm --filter @solar-display/web test`。
