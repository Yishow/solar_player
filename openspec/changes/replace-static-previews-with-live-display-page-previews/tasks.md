## 1. 建立 live preview 共用能力

- [ ] 1.1 實作 **Shared live preview renderer**，讓 **Render live preview surfaces from published display page config** 由共用 preview component 渲染 published display page contract，而不是讀取固定 JPG，並以 preview component tests 驗證 published config 變更會反映到 preview。
- [ ] 1.2 實作 **Live stage preview data source**，讓 `Playback Settings` 與 `Slideshow Preview` 共用 published `live` stage config 與 page renderer 解析流程，以交付 **Render live preview surfaces from published display page config**，並以 integration tests 驗證兩個 management surface 顯示同一份 live preview。

## 2. 補上 preview 邊界與驗證

- [ ] 2.1 實作 **Preview fallback semantics**，讓 **Surface preview fallback state explicitly** 與 **Keep live preview surfaces read-only** 在 asset 缺失、config 載入失敗或 runtime payload 不可用時仍顯示明確 placeholder 且不暴露 editor controls，並以 UI tests 驗證 fallback / read-only state。
- [ ] 2.2 移除以靜態 illustration 作為 primary preview source 的依賴並補齊 regression coverage，確認 preview 與正式 published display page 維持一致，並以 `pnpm exec spectra analyze replace-static-previews-with-live-display-page-previews` 與 `pnpm exec spectra validate --strict --changes replace-static-previews-with-live-display-page-previews` 驗證交付。
