## 1. 樣式優化與建議實作

- [x] 1.1 編輯 `apps/web/src/styles/management.css`，重構 `.mgmt-interactive-card:hover` 與 `.mgmt-interactive-card:focus-within` 的樣式，移除位移、陰影以及背景色變化，使其在 hover 時不起任何效果。
- [x] 1.2 編輯 `apps/web/src/pages/PlaybackSettings/playbackSettings.css`，將 `.ps-bottom-cards` 調整為彈性響應式寬度與網格寬度 `repeat(4, minmax(360px, 1fr))`。
- [x] 1.3 編輯 `apps/web/src/components/management/RemoteSyncBanner.tsx`，加入 `useState` 的 `isLoading` 管理狀態，並為「重新同步」按鈕套用 loading 狀態（改為「同步中...」並 disabled），提升 UI 回饋。
- [x] 1.4 在 `PlaybackSettingsFormSections.tsx` 中將 Grid item 子容器改為一般的 `ps-card-wrapper` 元素以避免 CSS Grid 與 `.settings-card` 的絕對定位衝突。

## 2. 驗證

- [x] 2.1 執行 `pnpm run build` 與相關測試，確保版面不重疊且功能正常。
