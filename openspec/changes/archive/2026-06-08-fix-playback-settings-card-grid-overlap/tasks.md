## 1. 樣式修正

- [x] 1.1 編輯 `apps/web/src/pages/PlaybackSettings/playbackSettings.css`，將 `.playback-settings-page .settings-card` 選擇器改為 `.playback-settings-page .settings-card.mgmt-interactive-card`，強制其 `position: relative` 以利在 Grid 中正確排列。

## 2. 驗證

- [x] 2.1 執行 `pnpm run build` 與相關測試，確保版面不重疊且功能正常。
