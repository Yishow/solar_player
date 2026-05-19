## 1. 建立共用 runtime lifecycle

- [x] 1.1 實作 **Shared runtime refresh hook family**，讓 **Bootstrap display page runtime through a shared lifecycle** 取代五頁各自的 fetch-once logic，並以 shared hook tests 驗證 runtime mode 會輸出一致的 loading / fallback state。
- [x] 1.2 實作 **Page-to-source refresh registry**，讓 **Refresh page-specific runtime sources through the registry** 以明確 mapping 決定 `Overview`、`Solar`、`FactoryCircuit`、`Images`、`Sustainability` 的 source 與 refresh key，並以 registry tests 驗證每頁會走正確的 runtime source。

## 2. 收斂失敗與回退語意

- [x] 2.1 實作 **Common stale and error semantics**，讓 **Surface common stale and error semantics after runtime refresh failure** 在五頁上輸出一致的 error / stale / fallback contract，並以頁面或 hook tests 驗證 refresh 失敗時保留 fallback-safe rendering。
- [x] 2.2 移除五頁 index component 內分散的 page-local runtime refresh 邏輯並補齊 regression coverage，確認共享 lifecycle 不改變既有 seed fallback 與版面契約，並以 `pnpm exec spectra analyze unify-display-page-runtime-refresh-contracts` 與 `pnpm exec spectra validate --strict --changes unify-display-page-runtime-refresh-contracts` 驗證交付。
