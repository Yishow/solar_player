## Why

當 `RemoteSyncBanner` (遠端同步提示橫幅) 渲染時，由於缺乏絕對定位屬性，它會以普通塊級元素（block）插入到文檔流中，撐開頂部空間。這會導致採用絕對定位（`position: absolute; top: 118px`）的卡片在視覺上與橫幅重疊或出現頂部對齊偏差。此外，卡片在 1080p 螢幕上 Hover 向上位移時，有時會因為瀏覽器 subpixel 渲染機制而產生像素抖動或文字模糊。

## What Changes

- **絕對定位遠端同步橫幅**：在 `RemoteSyncBanner.tsx` 中為橫幅加入 `.mgmt-remote-sync-banner`，並在各個管理與設定頁面的 CSS 中對其進行精確的絕對定位，使其完美融入版面，絕不干擾或重疊下方的設定卡片。
- **優化 subpixel 3D 渲染**：在全域 `management.css` 的 `.mgmt-interactive-card` 樣式中引入 `transform-style: preserve-3d`、`perspective: 1000px` 等屬性，防範 Hover 位移時的 subpixel 像素抖動與模糊。

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
    - apps/web/src/pages/CircuitSettings/circuitSettings.css
    - apps/web/src/pages/ImageManagement/imageManagement.css
    - apps/web/src/pages/MqttSettings/mqttSettings.css
    - apps/web/src/pages/PlaybackSettings/playbackSettings.css
