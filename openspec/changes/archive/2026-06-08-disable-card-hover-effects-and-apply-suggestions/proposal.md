## Why

根據使用者需求，卡片的 Hover 向上位移、背景與陰影加深效果在某些操作場景下會造成干擾或不必要的視覺雜音，我們需要將卡片 Hover 特效移除，使卡片外觀在普通狀態與 Hover 狀態下完全保持一致。此外，我們同步實作前幾輪提出的 Layout 優化建議：為 Playback 底部卡片加上縮放響應式支援，以及為遠端同步橫幅按鈕新增 Loading 載入提示。

## What Changes

- **移除卡片 Hover 效果**：在 `management.css` 中重構 `.mgmt-interactive-card:hover`，取消 `transform` 向上平移、取消陰影及背景色的改變，維持與基礎狀態一致的視覺。
- **實作 Playback 底部卡片響應式**：修改 `playbackSettings.css` 裡的 `.ps-bottom-cards`，寬度設為百分比並採用 `grid-template-columns: repeat(4, minmax(360px, 1fr))`，以支援小解析度螢幕的彈性收縮。
- **實作橫幅按鈕 Loading 狀態**：在 `RemoteSyncBanner.tsx` 中使用本地 `useState` 追蹤同步狀態，點擊後按鈕設為 disabled，文字變更為「同步中... (Reloading...)」。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/components/management/RemoteSyncBanner.tsx
    - apps/web/src/styles/management.css
    - apps/web/src/pages/PlaybackSettings/playbackSettings.css
