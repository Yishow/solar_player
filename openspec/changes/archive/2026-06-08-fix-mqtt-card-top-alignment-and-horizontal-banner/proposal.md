## Why

在 `/settings/mqtt` (MQTT設定) 頁面以及其他設定頁面中，當 `RemoteSyncBanner` 顯示時，它原本是垂直佈局（約 120px 高），且定位在 `top: 92px`，這會向下延伸並遮擋住第一張卡片（`mqtt-mode`）的頂部 Header 標題。這造成了視覺上三張卡片的頂部沒有對齊的現象。

## What Changes

- **調整為水平扁平化橫幅**：重構 `RemoteSyncBanner.tsx` 及其 CSS 類別 `.mgmt-remote-sync-banner`，使警告文字偏左，按鈕群組偏右，高度從約 120px 縮減至精緻的 64px。
- **微調頁面級絕對定位**：
  - 在 `mqttSettings.css` 中，將橫幅定位在標題與按鈕之間的空檔處（`left: 450px; top: 18px; width: 850px;`），完全避開下方的卡片頂部，確保卡片在 `top: 118px` 露出並完美對齊。
  - 同步調整 `circuitSettings.css`（`left: 420px; top: 18px; width: 640px;`）與 `imageManagement.css`（`left: 450px; top: 18px; width: 820px;`），消除對卡片頂部的任何遮擋。
  - 在 `playbackSettings.css` 保持 `left: 58px; top: 92px`，但由於橫幅高度減半，對排版空間有更大釋放。

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
