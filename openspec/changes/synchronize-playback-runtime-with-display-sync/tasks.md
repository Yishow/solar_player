## 1. 擴充播放 runtime 的 sync 觸發

- [ ] 1.1 實作 **Scope-aware display sync reload triggers**，讓 **Reload playback runtime after relevant display sync** 以 `display:sync` scope 決定是否重載 playback runtime，並以 hook tests 驗證 relevant scope 會觸發 reload、irrelevant scope 不會觸發 reload。
- [ ] 1.2 實作 **Debounced reload behavior**，讓 **Coalesce repeated display sync reloads** 在 burst sync 情況下只產生受控的 reload 週期，並以 unit tests 驗證短時間連續事件不會造成重複或無界的 runtime refresh。

## 2. 對齊 route 與 fallback 行為

- [ ] 2.1 實作 **Runtime reconciliation after preview refresh**，讓 **Reconcile current route after runtime refresh** 在 current route 仍 playable 時保留連續性、在 route 被 skip 時切到新的 playable route 或 fallback，並以 `usePageRotation` / `usePlaybackController` 測試驗證 route 轉移結果。
- [ ] 2.2 補齊播放 runtime regression coverage 與 artifact 驗證，確認 client runtime 與 server rotation preview 在 `display-pages`、`images`、`mqtt`、`circuits` sync 後維持一致，並以 `pnpm exec spectra analyze synchronize-playback-runtime-with-display-sync` 與 `pnpm exec spectra validate --strict --changes synchronize-playback-runtime-with-display-sync` 驗證交付。
